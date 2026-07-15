-- AlterTable
ALTER TABLE `settings` ADD COLUMN `receiveNotifications` BOOLEAN NOT NULL DEFAULT true,
    ADD COLUMN `theme` ENUM('LIGHT', 'DARK', 'SYSTEM') NOT NULL DEFAULT 'SYSTEM';
