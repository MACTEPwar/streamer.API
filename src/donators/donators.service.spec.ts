import { DonatorsService } from './donators.service';
import {
  DonatorRecord,
  DonatorsProvider,
} from './interfaces/donators-provider.interface';

describe('DonatorsService', () => {
  const buildService = (records: DonatorRecord[]) => {
    const provider: DonatorsProvider = {
      getTop: jest.fn().mockResolvedValue(records),
    };
    return new DonatorsService(provider);
  };

  it('filters out records with a null/zero/negative amount or empty nickname', async () => {
    const service = buildService([
      { nickname: 'valid1', amount: 100 },
      { nickname: 'noAmount', amount: null },
      { nickname: 'zeroAmount', amount: 0 },
      { nickname: 'negativeAmount', amount: -50 },
      { nickname: '   ', amount: 200 },
    ]);

    const result = await service.getTop();

    expect(result).toEqual([{ nickname: 'valid1', amount: 100 }]);
  });

  it('sorts by amount descending', async () => {
    const service = buildService([
      { nickname: 'low', amount: 100 },
      { nickname: 'high', amount: 500 },
      { nickname: 'mid', amount: 250 },
    ]);

    const result = await service.getTop();

    expect(result.map((d) => d.nickname)).toEqual(['high', 'mid', 'low']);
  });

  it('caps the result at 5 entries', async () => {
    const records = Array.from({ length: 8 }, (_, i) => ({
      nickname: `donator${i}`,
      amount: i + 1,
    }));
    const service = buildService(records);

    const result = await service.getTop();

    expect(result).toHaveLength(5);
    expect(result.map((d) => d.amount)).toEqual([8, 7, 6, 5, 4]);
  });

  it('returns fewer than 5 entries when fewer are valid', async () => {
    const service = buildService([{ nickname: 'onlyOne', amount: 42 }]);

    const result = await service.getTop();

    expect(result).toEqual([{ nickname: 'onlyOne', amount: 42 }]);
  });
});
