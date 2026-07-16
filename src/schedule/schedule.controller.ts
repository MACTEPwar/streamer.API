import {
  Body,
  Controller,
  Get,
  Param,
  ParseEnumPipe,
  Patch,
  UseGuards,
} from '@nestjs/common';
import { ApiOkResponse, ApiResponse, ApiTags } from '@nestjs/swagger';
import { Roles } from '../auth/decorators/roles.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Role, Weekday } from '../generated/prisma/enums';
import { ErrorResponseDto } from '../shared/dto/error-response.dto';
import { ScheduleDto } from './dto/schedule.dto';
import { UpdateScheduleDto } from './dto/update-schedule.dto';
import { ScheduleService } from './schedule.service';

@ApiTags('schedule')
@Controller('schedule')
export class ScheduleController {
  constructor(private readonly scheduleService: ScheduleService) {}

  @Get()
  @ApiOkResponse({ type: ScheduleDto, isArray: true })
  findAll(): Promise<ScheduleDto[]> {
    return this.scheduleService.findAll();
  }

  @Patch(':weekday')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  @ApiOkResponse({ type: ScheduleDto })
  @ApiResponse({ status: 401, type: ErrorResponseDto })
  @ApiResponse({ status: 403, type: ErrorResponseDto })
  update(
    @Param('weekday', new ParseEnumPipe(Weekday)) weekday: Weekday,
    @Body() dto: UpdateScheduleDto,
  ): Promise<ScheduleDto> {
    return this.scheduleService.update(weekday, dto);
  }
}
