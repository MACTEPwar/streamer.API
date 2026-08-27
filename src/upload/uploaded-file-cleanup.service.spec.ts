import { Logger } from '@nestjs/common';
import { readdir, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { UPLOADS_DIR } from './constants/upload.constant';
import { PrismaService } from '../prisma/prisma.service';
import { UploadedFileCleanupService } from './uploaded-file-cleanup.service';

// Директория загрузок подменяется на временную: тест удаляет настоящие файлы,
// а не проверяет вызов замоканного unlink.
jest.mock('./constants/upload.constant', () => {
  const actual = jest.requireActual<
    typeof import('./constants/upload.constant')
  >('./constants/upload.constant');
  const nodeFs = jest.requireActual<typeof import('node:fs')>('node:fs');
  const nodeOs = jest.requireActual<typeof import('node:os')>('node:os');
  const nodePath = jest.requireActual<typeof import('node:path')>('node:path');

  return {
    ...actual,
    UPLOADS_DIR: nodeFs.mkdtempSync(
      nodePath.join(nodeOs.tmpdir(), 'uploads-cleanup-'),
    ),
  };
});

describe('UploadedFileCleanupService', () => {
  let service: UploadedFileCleanupService;

  const prismaMock = {
    newsImage: { count: jest.fn() },
    news: { count: jest.fn() },
    profile: { count: jest.fn() },
  };

  const unreferenced = () => {
    prismaMock.newsImage.count.mockResolvedValue(0);
    prismaMock.news.count.mockResolvedValue(0);
    prismaMock.profile.count.mockResolvedValue(0);
  };

  const createFile = async (name: string) => {
    await writeFile(join(UPLOADS_DIR, name), 'x');
  };

  const remainingFiles = () => readdir(UPLOADS_DIR);

  beforeAll(() => {
    // Удаление отсутствующего файла — штатная ветка, но её debug-строка
    // засоряет вывод прогона.
    jest.spyOn(Logger.prototype, 'debug').mockImplementation(() => undefined);
  });

  beforeEach(() => {
    jest.clearAllMocks();
    service = new UploadedFileCleanupService(
      prismaMock as unknown as PrismaService,
    );
  });

  it('deletes a file whose address is no longer used anywhere', async () => {
    await createFile('orphan.jpg');
    unreferenced();

    await service.deleteIfUnreferenced('/uploads/orphan.jpg');

    expect(await remainingFiles()).not.toContain('orphan.jpg');
  });

  it('keeps a file still used by an image of some news', async () => {
    await createFile('in-gallery.jpg');
    unreferenced();
    prismaMock.newsImage.count.mockResolvedValue(1);

    await service.deleteIfUnreferenced('/uploads/in-gallery.jpg');

    expect(await remainingFiles()).toContain('in-gallery.jpg');
  });

  it('keeps a file still used as the cover of another news', async () => {
    await createFile('other-cover.jpg');
    unreferenced();
    prismaMock.news.count.mockResolvedValue(1);

    await service.deleteIfUnreferenced('/uploads/other-cover.jpg');

    expect(await remainingFiles()).toContain('other-cover.jpg');
  });

  it('keeps a file still used as somebody avatar', async () => {
    await createFile('avatar.jpg');
    unreferenced();
    prismaMock.profile.count.mockResolvedValue(1);

    await service.deleteIfUnreferenced('/uploads/avatar.jpg');

    expect(await remainingFiles()).toContain('avatar.jpg');
  });

  it('ignores an address that does not point at our uploads', async () => {
    unreferenced();

    await service.deleteIfUnreferenced('https://example.com/pic.png');

    expect(prismaMock.newsImage.count).not.toHaveBeenCalled();
  });

  it('ignores an empty address', async () => {
    unreferenced();

    await service.deleteIfUnreferenced(null);

    expect(prismaMock.newsImage.count).not.toHaveBeenCalled();
  });

  it('stays silent when the file is already gone', async () => {
    unreferenced();

    await expect(
      service.deleteIfUnreferenced('/uploads/never-existed.jpg'),
    ).resolves.toBeUndefined();
  });
});
