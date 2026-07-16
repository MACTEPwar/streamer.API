import { Module } from '@nestjs/common';
import { DonatorsController } from './donators.controller';
import { DonatorsService } from './donators.service';
import { DONATORS_PROVIDER } from './interfaces/donators-provider.interface';
import { MockDonatorsProvider } from './providers/mock-donators.provider';

@Module({
  controllers: [DonatorsController],
  providers: [
    DonatorsService,
    { provide: DONATORS_PROVIDER, useClass: MockDonatorsProvider },
  ],
})
export class DonatorsModule {}
