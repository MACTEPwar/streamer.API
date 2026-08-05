-- streamer.API#73: PinnedNewsSlot разделяется на PinnedNews (что закреплено
-- + стиль, один раз на новость) и PinnedPlacement (позиция, своя на каждую
-- раскладку); PinnedGridViewport.MIDDLE убирается (SMALL/LARGE остаются).
-- Ниже — структурные изменения вперемешку с переносом существующих данных,
-- порядок шагов важен (см. комментарии).

-- CreateTable
CREATE TABLE `PinnedNews` (
    `id` VARCHAR(191) NOT NULL,
    `newsId` VARCHAR(191) NOT NULL,
    `coverImageUrl` VARCHAR(191) NULL,
    `imagePosition` ENUM('TOP', 'RIGHT', 'BOTTOM', 'LEFT') NOT NULL DEFAULT 'TOP',
    `imageSizePercent` INTEGER NOT NULL DEFAULT 50,
    `backgroundColor` VARCHAR(191) NOT NULL DEFAULT '#f9f9f9',
    `textColor` VARCHAR(191) NOT NULL DEFAULT '#1e1e1e',
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `PinnedNews_newsId_key`(`newsId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `PinnedPlacement` (
    `id` VARCHAR(191) NOT NULL,
    `pinnedNewsId` VARCHAR(191) NOT NULL,
    `layoutId` VARCHAR(191) NOT NULL,
    `colStart` INTEGER NOT NULL,
    `rowStart` INTEGER NOT NULL,
    `colSpan` INTEGER NOT NULL,
    `rowSpan` INTEGER NOT NULL,

    UNIQUE INDEX `PinnedPlacement_pinnedNewsId_layoutId_key`(`pinnedNewsId`, `layoutId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- DataMigration: один PinnedNews на уникальный newsId из сохраняемых слотов
-- (SMALL/LARGE, MIDDLE отбрасывается вместе с раскладкой). Стиль/обложка
-- берутся из LARGE-слота (основная раскладка); если новость закреплена
-- только в SMALL — из её слота. При нескольких слотах на один newsId внутри
-- одного вьюпорта (не должно происходить при штатной работе API, но не было
-- constraint'ом на уровне схемы) детерминированно берётся слот с минимальным id.
INSERT INTO `PinnedNews` (`id`, `newsId`, `coverImageUrl`, `imagePosition`, `imageSizePercent`, `backgroundColor`, `textColor`, `createdAt`)
SELECT UUID(), s.`newsId`, s.`coverImageUrl`, s.`imagePosition`, s.`imageSizePercent`, s.`backgroundColor`, s.`textColor`, s.`createdAt`
FROM `PinnedNewsSlot` s
INNER JOIN `PinnedGridLayout` l ON s.`layoutId` = l.`id`
WHERE l.`viewport` = 'LARGE'
  AND s.`id` = (
    SELECT MIN(s2.`id`) FROM `PinnedNewsSlot` s2
    INNER JOIN `PinnedGridLayout` l2 ON s2.`layoutId` = l2.`id`
    WHERE l2.`viewport` = 'LARGE' AND s2.`newsId` = s.`newsId`
  );

INSERT INTO `PinnedNews` (`id`, `newsId`, `coverImageUrl`, `imagePosition`, `imageSizePercent`, `backgroundColor`, `textColor`, `createdAt`)
SELECT UUID(), s.`newsId`, s.`coverImageUrl`, s.`imagePosition`, s.`imageSizePercent`, s.`backgroundColor`, s.`textColor`, s.`createdAt`
FROM `PinnedNewsSlot` s
INNER JOIN `PinnedGridLayout` l ON s.`layoutId` = l.`id`
WHERE l.`viewport` = 'SMALL'
  AND s.`newsId` NOT IN (SELECT `newsId` FROM `PinnedNews`)
  AND s.`id` = (
    SELECT MIN(s2.`id`) FROM `PinnedNewsSlot` s2
    INNER JOIN `PinnedGridLayout` l2 ON s2.`layoutId` = l2.`id`
    WHERE l2.`viewport` = 'SMALL' AND s2.`newsId` = s.`newsId`
  );

-- DataMigration: позиция каждого сохраняемого слота (SMALL/LARGE) переносится
-- в PinnedPlacement, привязанная к новому PinnedNews через newsId. Та же
-- дедупликация "минимальный id слота", что выше.
INSERT INTO `PinnedPlacement` (`id`, `pinnedNewsId`, `layoutId`, `colStart`, `rowStart`, `colSpan`, `rowSpan`)
SELECT UUID(), pn.`id`, s.`layoutId`, s.`colStart`, s.`rowStart`, s.`colSpan`, s.`rowSpan`
FROM `PinnedNewsSlot` s
INNER JOIN `PinnedGridLayout` l ON s.`layoutId` = l.`id`
INNER JOIN `PinnedNews` pn ON pn.`newsId` = s.`newsId`
WHERE l.`viewport` IN ('SMALL', 'LARGE')
  AND s.`id` = (
    SELECT MIN(s2.`id`) FROM `PinnedNewsSlot` s2
    WHERE s2.`layoutId` = s.`layoutId` AND s2.`newsId` = s.`newsId`
  );

-- DataMigration: раскладка MIDDLE удаляется вместе со своими слотами
-- (планшет книжкой уходит в SMALL, альбомом — в LARGE, решение продукта).
-- Обязательно до ALTER enum ниже — MySQL не позволит убрать значение enum,
-- пока есть строки, ссылающиеся на него.
DELETE FROM `PinnedGridLayout` WHERE `viewport` = 'MIDDLE';

-- DropTable
DROP TABLE `PinnedNewsSlot`;

-- AlterTable: PinnedGridViewport теряет MIDDLE
ALTER TABLE `PinnedGridLayout` MODIFY `viewport` ENUM('SMALL', 'LARGE') NOT NULL;

-- AddForeignKey
ALTER TABLE `PinnedNews` ADD CONSTRAINT `PinnedNews_newsId_fkey` FOREIGN KEY (`newsId`) REFERENCES `News`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `PinnedPlacement` ADD CONSTRAINT `PinnedPlacement_pinnedNewsId_fkey` FOREIGN KEY (`pinnedNewsId`) REFERENCES `PinnedNews`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `PinnedPlacement` ADD CONSTRAINT `PinnedPlacement_layoutId_fkey` FOREIGN KEY (`layoutId`) REFERENCES `PinnedGridLayout`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AlterTable: focal point картинки (nullable, null = центр 50/50)
ALTER TABLE `NewsImage` ADD COLUMN `focalX` INTEGER NULL, ADD COLUMN `focalY` INTEGER NULL;
