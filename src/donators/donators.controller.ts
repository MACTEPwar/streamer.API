import { Controller, Get } from '@nestjs/common';
import { ApiOkResponse, ApiTags } from '@nestjs/swagger';
import { DonatorDto } from './dto/donator.dto';
import { DonatorsService } from './donators.service';

@ApiTags('donators')
@Controller('donators')
export class DonatorsController {
  constructor(private readonly donatorsService: DonatorsService) {}

  @Get('top')
  @ApiOkResponse({ type: DonatorDto, isArray: true })
  getTop(): Promise<DonatorDto[]> {
    return this.donatorsService.getTop();
  }
}
