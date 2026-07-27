-- CreateTable
CREATE TABLE `AuthMethod` (
    `id` VARCHAR(191) NOT NULL,
    `userId` VARCHAR(191) NOT NULL,
    `type` ENUM('LOCAL', 'GOOGLE') NOT NULL,
    `identifier` VARCHAR(191) NOT NULL,
    `passwordHash` VARCHAR(191) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `AuthMethod_type_identifier_key`(`type`, `identifier`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `AuthMethod` ADD CONSTRAINT `AuthMethod_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `User`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- DataMigration: перенос локальных методов входа (login + passwordHash) в AuthMethod
INSERT INTO `AuthMethod` (`id`, `userId`, `type`, `identifier`, `passwordHash`, `createdAt`, `updatedAt`)
SELECT UUID(), `id`, 'LOCAL', `login`, `passwordHash`, NOW(3), NOW(3)
FROM `user`
WHERE `passwordHash` IS NOT NULL;

-- DataMigration: перенос Google-методов входа (googleId) в AuthMethod
INSERT INTO `AuthMethod` (`id`, `userId`, `type`, `identifier`, `passwordHash`, `createdAt`, `updatedAt`)
SELECT UUID(), `id`, 'GOOGLE', `googleId`, NULL, NOW(3), NOW(3)
FROM `user`
WHERE `googleId` IS NOT NULL;

-- DataMigration: бэкфилл Profile.name старым User.login там, где name ещё не заполнено
UPDATE `profile` p
JOIN `user` u ON u.`id` = p.`userId`
SET p.`name` = u.`login`
WHERE p.`name` IS NULL;

-- DataMigration: перенос Profile.email в SocialLink(type=EMAIL), данные не теряются при дропе колонки
INSERT INTO `SocialLink` (`id`, `userId`, `type`, `value`, `createdAt`, `updatedAt`)
SELECT UUID(), `userId`, 'EMAIL', `email`, NOW(3), NOW(3)
FROM `profile`
WHERE `email` IS NOT NULL;

-- DropIndex
DROP INDEX `User_googleId_key` ON `user`;

-- DropIndex
DROP INDEX `User_login_key` ON `user`;

-- AlterTable
ALTER TABLE `profile` DROP COLUMN `email`;

-- AlterTable
ALTER TABLE `user` DROP COLUMN `googleId`,
    DROP COLUMN `login`,
    DROP COLUMN `passwordHash`,
    DROP COLUMN `provider`;
