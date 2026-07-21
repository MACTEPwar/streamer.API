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

  it('resolves exactly 5 records, all with a positive amount', async () => {
    const provider = new MockDonatorsProvider();

    const records = await provider.getTop();

    expect(records).toHaveLength(5);
    records.forEach((record) => {
      expect(typeof record.amount).toBe('number');
      expect(record.amount as number).toBeGreaterThan(0);
    });
  });
});
