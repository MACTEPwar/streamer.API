import { Test, TestingModule } from '@nestjs/testing';
import { DonatorDto } from './dto/donator.dto';
import { DonatorsController } from './donators.controller';
import { DonatorsService } from './donators.service';

describe('DonatorsController', () => {
  let controller: DonatorsController;

  const fixture: DonatorDto[] = [
    { nickname: 'shadowfox', amount: 5000 },
    { nickname: 'nightwolf', amount: 2500 },
  ];
  const donatorsService = { getTop: jest.fn().mockResolvedValue(fixture) };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [DonatorsController],
      providers: [{ provide: DonatorsService, useValue: donatorsService }],
    }).compile();

    controller = module.get(DonatorsController);
  });

  it('returns the top donators from the service', async () => {
    const result = await controller.getTop();

    expect(result).toEqual(fixture);
  });
});
