import { Inject, Injectable } from '@nestjs/common';
import { TOP_DONATORS_LIMIT } from './constants/top-donators-limit.constant';
import { DonatorDto } from './dto/donator.dto';
import { DONATORS_PROVIDER } from './interfaces/donators-provider.interface';
import type {
  DonatorRecord,
  DonatorsProvider,
} from './interfaces/donators-provider.interface';

function isValidRecord(
  record: DonatorRecord,
): record is DonatorRecord & { amount: number } {
  return (
    typeof record.amount === 'number' &&
    Number.isFinite(record.amount) &&
    record.amount > 0 &&
    record.nickname.trim().length > 0
  );
}

@Injectable()
export class DonatorsService {
  constructor(
    @Inject(DONATORS_PROVIDER)
    private readonly donatorsProvider: DonatorsProvider,
  ) {}

  async getTop(): Promise<DonatorDto[]> {
    const records = await this.donatorsProvider.getTop();

    return records
      .filter(isValidRecord)
      .sort((a, b) => b.amount - a.amount)
      .slice(0, TOP_DONATORS_LIMIT)
      .map(({ nickname, amount }) => ({ nickname, amount }));
  }
}
