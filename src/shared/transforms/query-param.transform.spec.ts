import {
  parseBooleanParam,
  parseStringArrayParam,
} from './query-param.transform';

describe('parseBooleanParam', () => {
  it('parses the string forms a query string can carry', () => {
    expect(parseBooleanParam('true')).toBe(true);
    expect(parseBooleanParam('1')).toBe(true);
    expect(parseBooleanParam('false')).toBe(false);
    expect(parseBooleanParam('0')).toBe(false);
  });

  it('keeps `false` false — the reason this helper exists', () => {
    // enableImplicitConversion приводит строку через Boolean(), где
    // непустая 'false' становится true. Здесь этого произойти не должно.
    expect(parseBooleanParam('false')).not.toBe(true);
  });

  it('passes booleans through untouched', () => {
    expect(parseBooleanParam(true)).toBe(true);
    expect(parseBooleanParam(false)).toBe(false);
  });

  it('leaves an absent value absent', () => {
    expect(parseBooleanParam(undefined)).toBeUndefined();
    expect(parseBooleanParam(null)).toBeNull();
  });

  it('returns unrecognised input unchanged so @IsBoolean can reject it', () => {
    expect(parseBooleanParam('yes')).toBe('yes');
    expect(parseBooleanParam('')).toBe('');
  });
});

describe('parseStringArrayParam', () => {
  it('wraps a single repeated-param value into an array', () => {
    expect(parseStringArrayParam('tag-1')).toEqual(['tag-1']);
  });

  it('keeps a repeated param as the array express already built', () => {
    expect(parseStringArrayParam(['tag-1', 'tag-2'])).toEqual([
      'tag-1',
      'tag-2',
    ]);
  });

  it('splits a comma-separated value', () => {
    expect(parseStringArrayParam('tag-1,tag-2')).toEqual(['tag-1', 'tag-2']);
  });

  it('splits commas inside a repeated param too', () => {
    expect(parseStringArrayParam(['tag-1,tag-2', 'tag-3'])).toEqual([
      'tag-1',
      'tag-2',
      'tag-3',
    ]);
  });

  it('trims spacing and drops empty entries', () => {
    expect(parseStringArrayParam(' tag-1 , , tag-2 ')).toEqual([
      'tag-1',
      'tag-2',
    ]);
    expect(parseStringArrayParam('')).toEqual([]);
  });

  it('leaves an absent value absent', () => {
    expect(parseStringArrayParam(undefined)).toBeUndefined();
    expect(parseStringArrayParam(null)).toBeNull();
  });

  it('passes non-string entries through so @IsString({ each: true }) can reject them', () => {
    expect(parseStringArrayParam([1, 'tag-1'])).toEqual([1, 'tag-1']);
  });
});
