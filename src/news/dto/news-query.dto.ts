import { ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsArray,
  IsBoolean,
  IsDateString,
  IsOptional,
  IsString,
} from 'class-validator';
import { PaginationQueryDto } from '../../shared/dto/pagination-query.dto';
import {
  ToBooleanParam,
  ToStringArrayParam,
} from '../../shared/transforms/query-param.transform';

export class NewsQueryDto extends PaginationQueryDto {
  @ApiPropertyOptional({
    description: 'Substring filter (case-insensitive) — matches News.title',
  })
  @IsOptional()
  @IsString()
  search?: string;

  /**
   * @deprecated Оставлен ради админки, которая шлёт одну тему
   * (`admin-news-page`). Новые клиенты используют `tagIds`; условия
   * объединяются, дублирование id безопасно.
   */
  @ApiPropertyOptional({
    deprecated: true,
    description:
      'Deprecated — use tagIds. Filter by a specific NewsTag id; merged into tagIds',
  })
  @IsOptional()
  @IsString()
  tagId?: string;

  @ApiPropertyOptional({
    type: [String],
    description:
      'Filter by NewsTag ids — a news item matches if it carries ANY of them (ФИЛ-О-03). Repeat the param (tagIds=a&tagIds=b) or pass it comma-separated (tagIds=a,b)',
  })
  @IsOptional()
  @ToStringArrayParam()
  @IsArray()
  @IsString({ each: true })
  tagIds?: string[];

  @ApiPropertyOptional({
    description:
      'Lower bound of the publication period, inclusive (ФИЛ-О-02). ISO-8601; a date without time (2026-08-27) means the start of that day, UTC',
    example: '2026-08-01',
  })
  @IsOptional()
  @IsDateString()
  publishedFrom?: string;

  @ApiPropertyOptional({
    description:
      'Upper bound of the publication period, inclusive (ФИЛ-О-02). ISO-8601; a date without time (2026-08-27) means the END of that day, UTC — the whole day is included',
    example: '2026-08-27',
  })
  @IsOptional()
  @IsDateString()
  publishedTo?: string;

  @ApiPropertyOptional({
    type: Boolean,
    description:
      'Requires a session (ФИЛ-О-04). true — only news the reader liked, false — only news they did not. Omit the param to not filter by likes at all; sending false is NOT the same as omitting it',
  })
  @IsOptional()
  @ToBooleanParam()
  @IsBoolean()
  likedByCurrentUser?: boolean;

  @ApiPropertyOptional({
    type: Boolean,
    description:
      'Requires a session (ФИЛ-О-04). true — only news the reader viewed, false — only news they did not. Omit the param to not filter by views at all; sending false is NOT the same as omitting it',
  })
  @IsOptional()
  @ToBooleanParam()
  @IsBoolean()
  viewedByCurrentUser?: boolean;
}
