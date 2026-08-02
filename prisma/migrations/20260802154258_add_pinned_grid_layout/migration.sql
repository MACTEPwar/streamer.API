-- CreateTable
CREATE TABLE `PinnedGridLayout` (
    `id` VARCHAR(191) NOT NULL,
    `viewport` ENUM('SMALL', 'MIDDLE', 'LARGE') NOT NULL,
    `columns` INTEGER NOT NULL,
    `rows` INTEGER NOT NULL,
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `PinnedGridLayout_viewport_key`(`viewport`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `PinnedNewsSlot` (
    `id` VARCHAR(191) NOT NULL,
    `layoutId` VARCHAR(191) NOT NULL,
    `newsId` VARCHAR(191) NOT NULL,
    `colStart` INTEGER NOT NULL,
    `rowStart` INTEGER NOT NULL,
    `colSpan` INTEGER NOT NULL,
    `rowSpan` INTEGER NOT NULL,
    `imagePosition` ENUM('TOP', 'RIGHT', 'BOTTOM', 'LEFT') NOT NULL DEFAULT 'TOP',
    `imageSizePercent` INTEGER NOT NULL DEFAULT 50,
    `imageScale` DOUBLE NOT NULL DEFAULT 1,
    `imageOffsetX` INTEGER NOT NULL DEFAULT 50,
    `imageOffsetY` INTEGER NOT NULL DEFAULT 50,
    `backgroundColor` VARCHAR(191) NOT NULL DEFAULT '#f9f9f9',
    `textColor` VARCHAR(191) NOT NULL DEFAULT '#1e1e1e',
    `coverImageUrl` VARCHAR(191) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `PinnedNewsSlot` ADD CONSTRAINT `PinnedNewsSlot_layoutId_fkey` FOREIGN KEY (`layoutId`) REFERENCES `PinnedGridLayout`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `PinnedNewsSlot` ADD CONSTRAINT `PinnedNewsSlot_newsId_fkey` FOREIGN KEY (`newsId`) REFERENCES `News`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
