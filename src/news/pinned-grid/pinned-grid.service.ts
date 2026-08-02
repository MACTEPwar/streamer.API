import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma, PinnedGridViewport } from '../../generated/prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { PinnedGridLayoutDto } from './dto/pinned-grid-layout.dto';
import {
  UpdatePinnedGridLayoutDto,
  UpdatePinnedNewsSlotDto,
} from './dto/update-pinned-grid-layout.dto';
import { PINNED_LAYOUT_INCLUDE, toPinnedGridLayoutDto } from './pinned-grid.mapper';

@Injectable()
export class PinnedGridService {
  constructor(private readonly prisma: PrismaService) {}

  async getLayout(viewport: PinnedGridViewport): Promise<PinnedGridLayoutDto> {
    try {
      const layout = await this.prisma.pinnedGridLayout.findUniqueOrThrow({
        where: { viewport },
        include: PINNED_LAYOUT_INCLUDE,
      });

      return toPinnedGridLayoutDto(layout);
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2025'
      ) {
        throw new NotFoundException('Раскладка для этого вьюпорта не найдена');
      }
      throw error;
    }
  }

  async updateLayout(
    viewport: PinnedGridViewport,
    dto: UpdatePinnedGridLayoutDto,
  ): Promise<PinnedGridLayoutDto> {
    await this.assertNewsExists(dto.slots);

    const errors = this.validateSlots(
      dto.slots,
      dto.config.columns,
      dto.config.rows,
    );
    if (errors.length > 0) {
      throw new BadRequestException(errors.join('; '));
    }

    const layout = await this.prisma.$transaction(async (tx) => {
      const existing = await tx.pinnedGridLayout.findUniqueOrThrow({
        where: { viewport },
      });

      await tx.pinnedNewsSlot.deleteMany({
        where: { layoutId: existing.id },
      });

      return tx.pinnedGridLayout.update({
        where: { viewport },
        data: {
          columns: dto.config.columns,
          rows: dto.config.rows,
          slots: {
            create: dto.slots.map((slot) => ({
              newsId: slot.newsId,
              colStart: slot.colStart,
              rowStart: slot.rowStart,
              colSpan: slot.colSpan,
              rowSpan: slot.rowSpan,
              imagePosition: slot.style.imagePosition,
              imageSizePercent: slot.style.imageSizePercent,
              imageScale: slot.style.imageScale,
              imageOffsetX: slot.style.imageOffsetX,
              imageOffsetY: slot.style.imageOffsetY,
              backgroundColor: slot.style.backgroundColor,
              textColor: slot.style.textColor,
              coverImageUrl: slot.coverImageUrl ?? null,
            })),
          },
        },
        include: PINNED_LAYOUT_INCLUDE,
      });
    });

    return toPinnedGridLayoutDto(layout);
  }

  private async assertNewsExists(
    slots: UpdatePinnedNewsSlotDto[],
  ): Promise<void> {
    const newsIds = [...new Set(slots.map((slot) => slot.newsId))];
    if (newsIds.length === 0) {
      return;
    }

    const existing = await this.prisma.news.findMany({
      where: { id: { in: newsIds } },
      select: { id: true },
    });
    const existingIds = new Set(existing.map((news) => news.id));
    const missingIds = newsIds.filter((id) => !existingIds.has(id));

    if (missingIds.length > 0) {
      throw new BadRequestException(
        `Новости не найдены: ${missingIds.join(', ')}`,
      );
    }
  }

  private validateSlots(
    slots: UpdatePinnedNewsSlotDto[],
    columns: number,
    rows: number,
  ): string[] {
    const errors: string[] = [];
    const occupiedBy = new Map<string, string>();

    for (const slot of slots) {
      if (slot.colStart < 1 || slot.colStart > columns) {
        errors.push(
          `Слот «${slot.newsId}»: colStart=${slot.colStart} вне границ 1..${columns}`,
        );
      }
      if (slot.rowStart < 1 || slot.rowStart > rows) {
        errors.push(
          `Слот «${slot.newsId}»: rowStart=${slot.rowStart} вне границ 1..${rows}`,
        );
      }

      const colEnd = slot.colStart + slot.colSpan - 1;
      if (colEnd > columns) {
        errors.push(
          `Слот «${slot.newsId}»: colSpan=${slot.colSpan} выходит за правый край сетки (до колонки ${colEnd})`,
        );
      }

      const rowEnd = slot.rowStart + slot.rowSpan - 1;
      if (rowEnd > rows) {
        errors.push(
          `Слот «${slot.newsId}»: rowSpan=${slot.rowSpan} выходит за нижний край сетки (до строки ${rowEnd})`,
        );
      }

      for (
        let col = Math.max(slot.colStart, 1);
        col <= Math.min(colEnd, columns);
        col++
      ) {
        for (
          let row = Math.max(slot.rowStart, 1);
          row <= Math.min(rowEnd, rows);
          row++
        ) {
          const cellKey = `${col}:${row}`;
          const occupant = occupiedBy.get(cellKey);
          if (occupant) {
            errors.push(
              `Слоты «${occupant}» и «${slot.newsId}» пересекаются в ячейке [${col}, ${row}]`,
            );
          } else {
            occupiedBy.set(cellKey, slot.newsId);
          }
        }
      }
    }

    return errors;
  }
}
