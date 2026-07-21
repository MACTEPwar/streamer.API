import { Injectable } from '@nestjs/common';
import {
  DonatorRecord,
  DonatorsProvider,
} from '../interfaces/donators-provider.interface';

const FIXTURE: DonatorRecord[] = [
  { nickname: 'Лексик.З', amount: 79816 },
  { nickname: '-=AnGeL=-', amount: 18850 },
  { nickname: 'Михайло', amount: 17319 },
  { nickname: 'D.I.G.G.I', amount: 11160 },
  { nickname: 'D.I.I.G.I', amount: 5000 },
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
