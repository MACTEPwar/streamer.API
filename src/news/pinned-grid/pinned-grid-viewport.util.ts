import { BadRequestException } from '@nestjs/common';
import { PinnedGridViewport } from '../../generated/prisma/enums';

const VIEWPORT_BY_PARAM: Record<string, PinnedGridViewport> = {
  small: PinnedGridViewport.SMALL,
  middle: PinnedGridViewport.MIDDLE,
  large: PinnedGridViewport.LARGE,
};

export function parsePinnedGridViewport(value: string): PinnedGridViewport {
  const viewport = VIEWPORT_BY_PARAM[value.toLowerCase()];

  if (!viewport) {
    throw new BadRequestException(
      `Неизвестный вьюпорт «${value}», ожидается одно из: ${Object.keys(VIEWPORT_BY_PARAM).join(', ')}`,
    );
  }

  return viewport;
}
