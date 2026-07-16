export interface DonatorRecord {
  nickname: string;
  amount: number | null;
}

export interface DonatorsProvider {
  getTop(): Promise<DonatorRecord[]>;
}

export const DONATORS_PROVIDER = Symbol('DONATORS_PROVIDER');
