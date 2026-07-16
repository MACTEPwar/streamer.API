import { MockDonatorsProvider } from './mock-donators.provider';

describe('MockDonatorsProvider', () => {
  it('resolves a fixture of at most 5 records', async () => {
    const provider = new MockDonatorsProvider();

    const records = await provider.getTop();

    expect(records.length).toBeLessThanOrEqual(5);
    expect(records.length).toBeGreaterThan(0);
    records.forEach((record) => {
      expect(typeof record.nickname).toBe('string');
    });
  });

  it('includes at least one incomplete record (null amount)', async () => {
    const provider = new MockDonatorsProvider();

    const records = await provider.getTop();

    expect(records.some((record) => record.amount === null)).toBe(true);
  });
});
