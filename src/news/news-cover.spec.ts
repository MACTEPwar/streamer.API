import { NewsCoverType } from '../generated/prisma/enums';
import { resolveNewsCover } from './news-cover';

describe('resolveNewsCover', () => {
  const image = (
    url: string,
    focalX: number | null = null,
    focalY: number | null = null,
  ) => ({ url, order: 0, focalX, focalY });

  it('reports no cover when the news is deliberately without one', () => {
    const cover = resolveNewsCover({
      coverType: NewsCoverType.NONE,
      coverUrl: null,
      coverFocalX: null,
      coverFocalY: null,
      images: [image('/uploads/a.jpg', 10, 20)],
    });

    expect(cover).toEqual({ type: 'none', url: null, focalPoint: null });
  });

  it('takes the focal point of the news image the cover points at', () => {
    const cover = resolveNewsCover({
      coverType: NewsCoverType.IMAGE,
      coverUrl: '/uploads/b.jpg',
      coverFocalX: null,
      coverFocalY: null,
      images: [
        image('/uploads/a.jpg', 10, 20),
        image('/uploads/b.jpg', 30, 40),
      ],
    });

    expect(cover).toEqual({
      type: 'image',
      url: '/uploads/b.jpg',
      focalPoint: { x: 30, y: 40 },
    });
  });

  it('leaves the focal point empty when the referenced image has none', () => {
    const cover = resolveNewsCover({
      coverType: NewsCoverType.IMAGE,
      coverUrl: '/uploads/b.jpg',
      coverFocalX: null,
      coverFocalY: null,
      images: [image('/uploads/b.jpg')],
    });

    expect(cover.focalPoint).toBeNull();
  });

  it('keeps showing the cover when its image is no longer in the set', () => {
    const cover = resolveNewsCover({
      coverType: NewsCoverType.IMAGE,
      coverUrl: '/uploads/gone.jpg',
      coverFocalX: null,
      coverFocalY: null,
      images: [image('/uploads/a.jpg', 10, 20)],
    });

    expect(cover).toEqual({
      type: 'image',
      url: '/uploads/gone.jpg',
      focalPoint: null,
    });
  });

  it('takes the focal point from the news row for an own cover', () => {
    const cover = resolveNewsCover({
      coverType: NewsCoverType.CUSTOM,
      coverUrl: '/uploads/own.jpg',
      coverFocalX: 70,
      coverFocalY: 80,
      images: [image('/uploads/a.jpg', 10, 20)],
    });

    expect(cover).toEqual({
      type: 'custom',
      url: '/uploads/own.jpg',
      focalPoint: { x: 70, y: 80 },
    });
  });

  it('never falls back to the first image of the news', () => {
    const cover = resolveNewsCover({
      coverType: NewsCoverType.NONE,
      coverUrl: null,
      coverFocalX: null,
      coverFocalY: null,
      images: [image('/uploads/first.jpg', 10, 20)],
    });

    expect(cover.url).toBeNull();
  });

  it('treats a cover state without an url as no cover', () => {
    const cover = resolveNewsCover({
      coverType: NewsCoverType.CUSTOM,
      coverUrl: null,
      coverFocalX: 70,
      coverFocalY: 80,
      images: [],
    });

    expect(cover).toEqual({ type: 'none', url: null, focalPoint: null });
  });
});
