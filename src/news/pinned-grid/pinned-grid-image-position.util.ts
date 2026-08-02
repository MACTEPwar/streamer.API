import { CardImagePosition } from '../../generated/prisma/enums';

/**
 * Значение `imagePosition` на границе API — фронт (`CardImagePosition` в
 * `frontend/.../pinned-news-slot.model.ts`) использует нижний регистр,
 * Prisma-enum в БД — верхний (`streamer.API#71`). Конвертация только здесь,
 * на границе, схема/enum в БД не меняются (`streamer.API#73`).
 */
export type WireCardImagePosition = 'top' | 'right' | 'bottom' | 'left';

export const WIRE_CARD_IMAGE_POSITIONS: readonly WireCardImagePosition[] = [
  'top',
  'right',
  'bottom',
  'left',
];

const WIRE_TO_PRISMA: Record<WireCardImagePosition, CardImagePosition> = {
  top: CardImagePosition.TOP,
  right: CardImagePosition.RIGHT,
  bottom: CardImagePosition.BOTTOM,
  left: CardImagePosition.LEFT,
};

const PRISMA_TO_WIRE: Record<CardImagePosition, WireCardImagePosition> = {
  [CardImagePosition.TOP]: 'top',
  [CardImagePosition.RIGHT]: 'right',
  [CardImagePosition.BOTTOM]: 'bottom',
  [CardImagePosition.LEFT]: 'left',
};

export function toPrismaImagePosition(
  wire: WireCardImagePosition,
): CardImagePosition {
  return WIRE_TO_PRISMA[wire];
}

export function toWireImagePosition(
  prisma: CardImagePosition,
): WireCardImagePosition {
  return PRISMA_TO_WIRE[prisma];
}
