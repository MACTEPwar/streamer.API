import { NewsCoverType } from '../generated/prisma/enums';
import { NewsWithRelations, toNewsDto } from './news.mapper';

describe('toNewsDto', () => {
  const baseNews = {
    id: 'news-1',
    title: 'Открыт турнир',
    description: 'Описание',
    publishedAt: new Date('2026-01-01'),
    viewCount: 3,
    coverType: NewsCoverType.NONE,
    coverUrl: null,
    coverFocalX: null,
    coverFocalY: null,
    createdAt: new Date('2026-01-01'),
    updatedAt: new Date('2026-01-01'),
    images: [],
    tags: [],
    likes: [],
    views: [],
    _count: { likes: 0 },
  } as unknown as NewsWithRelations;

  it('reports the cover state of a news without one', () => {
    const dto = toNewsDto(baseNews);

    expect(dto.cover).toEqual({
      type: 'none',
      url: null,
      focalPoint: null,
      variants: [],
    });
  });

  it('reports the cover picked from the images of the news', () => {
    const dto = toNewsDto({
      ...baseNews,
      coverType: NewsCoverType.IMAGE,
      coverUrl: '/uploads/b.jpg',
      images: [
        {
          id: 'img-1',
          newsId: 'news-1',
          url: '/uploads/b.jpg',
          order: 0,
          focalX: 30,
          focalY: 40,
          createdAt: new Date('2026-01-01'),
        },
      ],
    });

    expect(dto.cover).toEqual({
      type: 'image',
      url: '/uploads/b.jpg',
      focalPoint: { x: 30, y: 40 },
      variants: [],
    });
  });

  it('does not report a cover for a news that only has images', () => {
    const dto = toNewsDto({
      ...baseNews,
      images: [
        {
          id: 'img-1',
          newsId: 'news-1',
          url: '/uploads/first.jpg',
          order: 0,
          focalX: null,
          focalY: null,
          createdAt: new Date('2026-01-01'),
        },
      ],
    });

    expect(dto.cover.url).toBeNull();
    expect(dto.images).toHaveLength(1);
  });
});
