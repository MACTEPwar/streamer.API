import { Injectable } from '@nestjs/common';
import {
  DonatorRecord,
  DonatorsProvider,
} from '../interfaces/donators-provider.interface';

const FIXTURE: DonatorRecord[] = [
  { nickname: 'shadowfox', amount: 5000 },
  { nickname: 'nightwolf', amount: 2500 },
  { nickname: 'ghostrider', amount: null },
  { nickname: 'ironclad', amount: 1200 },
  { nickname: 'silentstorm', amount: 800 },
];

/**
 * Заглушка внешнего сервиса доната — реальный провайдер выбирается позже
 * (см. #40) и подключается через тот же токен `DONATORS_PROVIDER`, без
 * изменений в `DonatorsService`/`DonatorsController`.
 */
@Injectable()
export class MockDonatorsProvider implements DonatorsProvider {
  getTop(): Promise<DonatorRecord[]> {
    return Promise.resolve(FIXTURE);
  }
}
