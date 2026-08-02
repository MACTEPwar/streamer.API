import { Prisma } from '../../generated/prisma/client';
import { PinnedGridLayoutDto } from './dto/pinned-grid-layout.dto';

export const PINNED_LAYOUT_INCLUDE = {
  slots: true,
} as const;

export type PinnedGridLayoutWithSlots = Prisma.PinnedGridLayoutGetPayload<{
  include: typeof PINNED_LAYOUT_INCLUDE;
}>;

export function toPinnedGridLayoutDto(
  layout: PinnedGridLayoutWithSlots,
): PinnedGridLayoutDto {
  return {
    config: {
      columns: layout.columns,
      rows: layout.rows,
    },
    slots: layout.slots.map((slot) => ({
      newsId: slot.newsId,
      colStart: slot.colStart,
      rowStart: slot.rowStart,
      colSpan: slot.colSpan,
      rowSpan: slot.rowSpan,
      style: {
        imagePosition: slot.imagePosition,
        imageSizePercent: slot.imageSizePercent,
        imageScale: slot.imageScale,
        imageOffsetX: slot.imageOffsetX,
        imageOffsetY: slot.imageOffsetY,
        backgroundColor: slot.backgroundColor,
        textColor: slot.textColor,
      },
      coverImageUrl: slot.coverImageUrl,
    })),
  };
}
