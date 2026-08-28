import { NewsCoverType } from '../generated/prisma/enums';
import { listImageVariants } from '../upload/image-variant.util';
import type { ImageVariant } from '../upload/image-variant.util';

/**
 * Состояние обложки на границе API: фронт использует нижний регистр, Prisma-enum
 * в БД — верхний, конвертация живёт только здесь (тот же приём, что у
 * `toWireImagePosition` для позиции картинки в карточке).
 */
export type WireNewsCoverType = 'none' | 'image' | 'custom';

export const WIRE_NEWS_COVER_TYPES: readonly WireNewsCoverType[] = [
  'none',
  'image',
  'custom',
];

const WIRE_TO_PRISMA: Record<WireNewsCoverType, NewsCoverType> = {
  none: NewsCoverType.NONE,
  image: NewsCoverType.IMAGE,
  custom: NewsCoverType.CUSTOM,
};

const PRISMA_TO_WIRE: Record<NewsCoverType, WireNewsCoverType> = {
  [NewsCoverType.NONE]: 'none',
  [NewsCoverType.IMAGE]: 'image',
  [NewsCoverType.CUSTOM]: 'custom',
};

export function toPrismaNewsCoverType(wire: WireNewsCoverType): NewsCoverType {
  return WIRE_TO_PRISMA[wire];
}

export function toWireNewsCoverType(prisma: NewsCoverType): WireNewsCoverType {
  return PRISMA_TO_WIRE[prisma];
}

export interface NewsCoverFocalPoint {
  x: number;
  y: number;
}

export interface ResolvedNewsCover {
  type: WireNewsCoverType;
  url: string | null;
  focalPoint: NewsCoverFocalPoint | null;
  variants: ImageVariant[];
}

interface NewsCoverSource {
  coverType: NewsCoverType;
  coverUrl: string | null;
  coverFocalX: number | null;
  coverFocalY: number | null;
  images: { url: string; focalX: number | null; focalY: number | null }[];
}

const NO_COVER: ResolvedNewsCover = {
  type: 'none',
  url: null,
  focalPoint: null,
  variants: [],
};

function toFocalPoint(
  x: number | null,
  y: number | null,
): NewsCoverFocalPoint | null {
  return x === null || y === null ? null : { x, y };
}

/**
 * Единственное место, где решается, какую картинку и с каким фокусом показывать
 * вместо новости — переиспользуется и лентой, и витриной, чтобы одна новость не
 * выглядела в них по-разному (`ОБЛ-О-01`). Первая картинка новости обложку не
 * подменяет: «осознанно без обложки» — такое же записанное состояние, как две
 * остальные (`ОБЛ-О-05`).
 */
export function resolveNewsCover(news: NewsCoverSource): ResolvedNewsCover {
  if (news.coverType === NewsCoverType.NONE || news.coverUrl === null) {
    return NO_COVER;
  }

  if (news.coverType === NewsCoverType.CUSTOM) {
    return {
      type: 'custom',
      url: news.coverUrl,
      focalPoint: toFocalPoint(news.coverFocalX, news.coverFocalY),
      variants: listImageVariants(news.coverUrl),
    };
  }

  const image = news.images.find(
    (candidate) => candidate.url === news.coverUrl,
  );

  return {
    type: 'image',
    url: news.coverUrl,
    focalPoint: image ? toFocalPoint(image.focalX, image.focalY) : null,
    variants: listImageVariants(news.coverUrl),
  };
}
