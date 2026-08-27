import { toInclusiveBoundary } from './published-boundary.util';

describe('toInclusiveBoundary', () => {
  it('expands a date-only lower bound to the start of that day', () => {
    expect(toInclusiveBoundary('2026-08-27', 'start').toISOString()).toBe(
      '2026-08-27T00:00:00.000Z',
    );
  });

  it('expands a date-only upper bound to the end of that day', () => {
    // Без этого `publishedTo=2026-08-27` молча отрезал бы весь день:
    // ФИЛ-О-02 требует, чтобы граница включалась в результат.
    expect(toInclusiveBoundary('2026-08-27', 'end').toISOString()).toBe(
      '2026-08-27T23:59:59.999Z',
    );
  });

  it('takes a full ISO datetime as the exact moment it names', () => {
    expect(
      toInclusiveBoundary('2026-08-27T10:30:00.000Z', 'start').toISOString(),
    ).toBe('2026-08-27T10:30:00.000Z');
    expect(
      toInclusiveBoundary('2026-08-27T10:30:00.000Z', 'end').toISOString(),
    ).toBe('2026-08-27T10:30:00.000Z');
  });

  it('keeps the offset of a datetime that carries one', () => {
    expect(
      toInclusiveBoundary('2026-08-27T10:30:00+03:00', 'end').toISOString(),
    ).toBe('2026-08-27T07:30:00.000Z');
  });
});
