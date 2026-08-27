import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { NewsQueryDto } from './news-query.dto';

/**
 * Разбор проверяется ровно на тех опциях, что стоят в глобальном
 * `ValidationPipe` (`main.ts`) — в первую очередь на `enableImplicitConversion`,
 * из-за которого строка `'false'` без явного трансформа превращалась бы в
 * `true`. Юнит-тест самого трансформа этого не ловит: там нет неявного
 * приведения, которое он обходит.
 */
function parseQuery(raw: Record<string, unknown>): NewsQueryDto {
  return plainToInstance(NewsQueryDto, raw, {
    enableImplicitConversion: true,
  });
}

describe('NewsQueryDto', () => {
  it('keeps a `false` interaction flag false under implicit conversion', async () => {
    const dto = parseQuery({
      likedByCurrentUser: 'false',
      viewedByCurrentUser: 'false',
    });

    expect(dto.likedByCurrentUser).toBe(false);
    expect(dto.viewedByCurrentUser).toBe(false);
    expect(await validate(dto)).toHaveLength(0);
  });

  it('reads a `true` interaction flag as true', async () => {
    const dto = parseQuery({ likedByCurrentUser: 'true' });

    expect(dto.likedByCurrentUser).toBe(true);
    expect(await validate(dto)).toHaveLength(0);
  });

  it('leaves an omitted interaction flag undefined — that is «do not filter»', async () => {
    const dto = parseQuery({});

    expect(dto.likedByCurrentUser).toBeUndefined();
    expect(dto.viewedByCurrentUser).toBeUndefined();
    expect(await validate(dto)).toHaveLength(0);
  });

  it('rejects an interaction flag that is neither true nor false', async () => {
    const dto = parseQuery({ likedByCurrentUser: 'maybe' });

    const errors = await validate(dto);

    expect(
      errors.some((error) => error.property === 'likedByCurrentUser'),
    ).toBe(true);
  });

  it('accepts tagIds as a repeated param', async () => {
    const dto = parseQuery({ tagIds: ['tag-1', 'tag-2'] });

    expect(dto.tagIds).toEqual(['tag-1', 'tag-2']);
    expect(await validate(dto)).toHaveLength(0);
  });

  it('accepts tagIds as a single value and as a comma-separated list', async () => {
    expect(parseQuery({ tagIds: 'tag-1' }).tagIds).toEqual(['tag-1']);
    expect(parseQuery({ tagIds: 'tag-1,tag-2' }).tagIds).toEqual([
      'tag-1',
      'tag-2',
    ]);
  });

  it('accepts a period given as plain dates and as full timestamps', async () => {
    const dates = parseQuery({
      publishedFrom: '2026-08-01',
      publishedTo: '2026-08-27',
    });
    expect(await validate(dates)).toHaveLength(0);

    const timestamps = parseQuery({
      publishedFrom: '2026-08-01T00:00:00.000Z',
      publishedTo: '2026-08-27T23:59:59.999Z',
    });
    expect(await validate(timestamps)).toHaveLength(0);
  });

  it('rejects a period boundary that is not a date', async () => {
    const errors = await validate(parseQuery({ publishedTo: 'вчера' }));

    expect(errors.some((error) => error.property === 'publishedTo')).toBe(true);
  });

  it('still accepts the deprecated single tagId', async () => {
    const dto = parseQuery({ tagId: 'tag-1' });

    expect(dto.tagId).toBe('tag-1');
    expect(await validate(dto)).toHaveLength(0);
  });
});
