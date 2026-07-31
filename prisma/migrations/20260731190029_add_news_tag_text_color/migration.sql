-- AlterTable
ALTER TABLE `newstag` ADD COLUMN `textColor` VARCHAR(191) NULL;

-- Backfill existing rows with a default text color
UPDATE `newstag` SET `textColor` = '#FFFFFF' WHERE `textColor` IS NULL;

-- AlterTable
ALTER TABLE `newstag` MODIFY COLUMN `textColor` VARCHAR(191) NOT NULL;
