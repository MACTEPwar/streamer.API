-- DataMigration: адрес обложки закрепления мог храниться абсолютным
-- (http://host/uploads/...) — фронт сохранял его вместе с origin. Обложка
-- всегда отдаётся со своего сервера (ОБЛ-Б-02), поэтому адрес приводится к
-- локальному пути; иначе одна и та же картинка не совпадает сама с собой.
UPDATE `News`
SET `coverUrl` = SUBSTRING(`coverUrl`, LOCATE('/uploads/', `coverUrl`))
WHERE `coverUrl` IS NOT NULL
  AND `coverUrl` NOT LIKE '/uploads/%'
  AND LOCATE('/uploads/', `coverUrl`) > 0;

-- DataMigration: после нормализации часть обложек, попавших в «свои» только
-- из-за формы адреса, оказывается картинками из набора новости.
UPDATE `News` n
SET n.`coverType` = 'IMAGE'
WHERE n.`coverType` = 'CUSTOM'
  AND n.`coverUrl` IS NOT NULL
  AND EXISTS (
      SELECT 1 FROM `NewsImage` i
      WHERE i.`newsId` = n.`id` AND i.`url` = n.`coverUrl`
  );
