import { PaginationMetaDto } from '../dto/pagination-meta.dto';

export function buildPaginationMeta(
  page: number,
  limit: number,
  total: number,
): PaginationMetaDto {
  return {
    page,
    limit,
    total,
    totalPages: Math.ceil(total / limit),
  };
}
