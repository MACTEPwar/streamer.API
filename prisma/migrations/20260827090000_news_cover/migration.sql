-- AlterTable: новые колонки обложки, старые пока на месте — они нужны бэкфиллу ниже
ALTER TABLE `News`
    ADD COLUMN `coverType` ENUM('NONE', 'IMAGE', 'CUSTOM') NOT NULL DEFAULT 'NONE',
    ADD COLUMN `coverUrl` VARCHAR(191) NULL,
    ADD COLUMN `coverFocalX` INTEGER NULL,
    ADD COLUMN `coverFocalY` INTEGER NULL;

-- DataMigration: обложка закрепления, совпадающая с картинкой новости, — это выбор
-- «одна из изображений новости». Приоритет у неё выше, чем у hasNoImage: она реально
-- отображалась в витрине, а hasNoImage не влиял ни на одну ветку логики.
UPDATE `News` n
JOIN `PinnedNews` p ON p.`newsId` = n.`id`
SET n.`coverType` = 'IMAGE',
    n.`coverUrl` = p.`coverImageUrl`
WHERE p.`coverImageUrl` IS NOT NULL
  AND EXISTS (
      SELECT 1 FROM `NewsImage` i
      WHERE i.`newsId` = n.`id` AND i.`url` = p.`coverImageUrl`
  );

-- DataMigration: обложка закрепления, не совпавшая ни с одной картинкой новости, —
-- это своя обложка. Файл уже лежит на нашем сервере, переносить нечего.
UPDATE `News` n
JOIN `PinnedNews` p ON p.`newsId` = n.`id`
SET n.`coverType` = 'CUSTOM',
    n.`coverUrl` = p.`coverImageUrl`
WHERE p.`coverImageUrl` IS NOT NULL
  AND NOT EXISTS (
      SELECT 1 FROM `NewsImage` i
      WHERE i.`newsId` = n.`id` AND i.`url` = p.`coverImageUrl`
  );

-- DataMigration: остальным новостям с картинками и без отметки «без фото» назначается
-- первая картинка по порядку — именно её показывали витрина и лента до этой миграции,
-- так что внешне ничего не меняется. Новости с hasNoImage = 1 и новости без картинок
-- остаются в состоянии NONE (дефолт колонки).
UPDATE `News` n
SET n.`coverType` = 'IMAGE',
    n.`coverUrl` = (
        SELECT i.`url` FROM `NewsImage` i
        WHERE i.`newsId` = n.`id`
        ORDER BY i.`order` ASC, i.`createdAt` ASC
        LIMIT 1
    )
WHERE n.`coverType` = 'NONE'
  AND n.`hasNoImage` = 0
  AND EXISTS (SELECT 1 FROM `NewsImage` i WHERE i.`newsId` = n.`id`);

-- AlterTable: половинчатые механизмы удаляются только после переноса их смысла
ALTER TABLE `News` DROP COLUMN `hasNoImage`;

ALTER TABLE `PinnedNews` DROP COLUMN `coverImageUrl`;
