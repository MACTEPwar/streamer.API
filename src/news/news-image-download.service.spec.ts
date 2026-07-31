import { BadRequestException } from '@nestjs/common';
import { EventEmitter } from 'node:events';
import { createWriteStream } from 'node:fs';
import { access, unlink } from 'node:fs/promises';
import { lookup } from 'node:dns/promises';
import { UPLOADS_URL_PREFIX } from '../upload/constants/upload.constant';
import { NewsImageDownloadService } from './news-image-download.service';

jest.mock('node:dns/promises', () => ({ lookup: jest.fn() }));
jest.mock('node:fs/promises', () => ({
  access: jest.fn(),
  unlink: jest.fn(),
}));
jest.mock('node:fs', () => {
  const actual: typeof import('node:fs') = jest.requireActual('node:fs');
  return { ...actual, createWriteStream: jest.fn() };
});

class FakeWriteStream extends EventEmitter {
  write = jest.fn(() => true);
  end = jest.fn(() => {
    queueMicrotask(() => this.emit('finish'));
  });
  destroy = jest.fn();
}

describe('NewsImageDownloadService', () => {
  let service: NewsImageDownloadService;
  const lookupMock = lookup as jest.Mock;
  const accessMock = access as jest.Mock;
  const unlinkMock = unlink as jest.Mock;
  const createWriteStreamMock = createWriteStream as jest.Mock;
  let fetchMock: jest.Mock;

  beforeEach(() => {
    jest.clearAllMocks();
    service = new NewsImageDownloadService();
    fetchMock = jest.fn();
    global.fetch = fetchMock;
    createWriteStreamMock.mockImplementation(() => new FakeWriteStream());
  });

  describe('local /uploads/* paths', () => {
    it('accepts an existing local upload path as-is without downloading', async () => {
      accessMock.mockResolvedValue(undefined);

      const { resolved, downloadedFilePaths } = await service.resolveImageUrls([
        `${UPLOADS_URL_PREFIX}/abc.jpg`,
      ]);

      expect(resolved).toEqual([{ url: `${UPLOADS_URL_PREFIX}/abc.jpg` }]);
      expect(downloadedFilePaths).toEqual([]);
      expect(fetchMock).not.toHaveBeenCalled();
    });

    it('throws BadRequestException when the local file does not exist', async () => {
      accessMock.mockRejectedValue(new Error('ENOENT'));

      await expect(
        service.resolveImageUrls([`${UPLOADS_URL_PREFIX}/missing.jpg`]),
      ).rejects.toThrow(BadRequestException);
    });

    it('rejects a path-traversal attempt in the local filename', async () => {
      await expect(
        service.resolveImageUrls([`${UPLOADS_URL_PREFIX}/../../etc/passwd`]),
      ).rejects.toThrow(BadRequestException);
      expect(accessMock).not.toHaveBeenCalled();
    });
  });

  describe('URL/protocol validation', () => {
    it('rejects a non-http(s) protocol', async () => {
      await expect(
        service.resolveImageUrls(['file:///etc/passwd']),
      ).rejects.toThrow(BadRequestException);
      expect(lookupMock).not.toHaveBeenCalled();
    });

    it('rejects a malformed URL', async () => {
      await expect(service.resolveImageUrls(['not a url'])).rejects.toThrow(
        BadRequestException,
      );
    });
  });

  describe('SSRF protection', () => {
    it('rejects a hostname resolving to a private IPv4 address', async () => {
      lookupMock.mockResolvedValue([{ address: '10.0.0.5', family: 4 }]);

      await expect(
        service.resolveImageUrls(['https://internal.example.com/pic.jpg']),
      ).rejects.toThrow(BadRequestException);
      expect(fetchMock).not.toHaveBeenCalled();
    });

    it('rejects loopback (127.0.0.1)', async () => {
      lookupMock.mockResolvedValue([{ address: '127.0.0.1', family: 4 }]);

      await expect(
        service.resolveImageUrls(['http://localhost/pic.jpg']),
      ).rejects.toThrow(BadRequestException);
      expect(fetchMock).not.toHaveBeenCalled();
    });

    it('rejects IPv6 loopback (::1)', async () => {
      lookupMock.mockResolvedValue([{ address: '::1', family: 6 }]);

      await expect(
        service.resolveImageUrls(['http://ipv6-host/pic.jpg']),
      ).rejects.toThrow(BadRequestException);
    });

    it('throws BadRequestException when DNS resolution fails', async () => {
      lookupMock.mockRejectedValue(new Error('ENOTFOUND'));

      await expect(
        service.resolveImageUrls(['https://does-not-resolve.example/pic.jpg']),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('successful download + partial-failure rollback', () => {
    it('downloads a valid external image and returns its local /uploads/ URL', async () => {
      lookupMock.mockResolvedValue([{ address: '93.184.216.34', family: 4 }]);
      fetchMock.mockResolvedValue(
        new Response('fake-image-bytes', {
          status: 200,
          headers: { 'content-type': 'image/png' },
        }),
      );

      const { resolved, downloadedFilePaths } = await service.resolveImageUrls([
        'https://example.com/pic.png',
      ]);

      expect(resolved).toHaveLength(1);
      expect(resolved[0].url.startsWith(`${UPLOADS_URL_PREFIX}/`)).toBe(true);
      expect(downloadedFilePaths).toHaveLength(1);
    });

    it('rejects a disallowed content-type', async () => {
      lookupMock.mockResolvedValue([{ address: '93.184.216.34', family: 4 }]);
      fetchMock.mockResolvedValue(
        new Response('<html></html>', {
          status: 200,
          headers: { 'content-type': 'text/html' },
        }),
      );

      await expect(
        service.resolveImageUrls(['https://example.com/page.html']),
      ).rejects.toThrow(BadRequestException);
    });

    it('rejects a non-2xx response', async () => {
      lookupMock.mockResolvedValue([{ address: '93.184.216.34', family: 4 }]);
      fetchMock.mockResolvedValue(new Response(null, { status: 404 }));

      await expect(
        service.resolveImageUrls(['https://example.com/missing.png']),
      ).rejects.toThrow(BadRequestException);
    });

    it('cleans up an already-downloaded file when a later URL in the same request fails', async () => {
      lookupMock
        .mockResolvedValueOnce([{ address: '93.184.216.34', family: 4 }])
        .mockResolvedValueOnce([{ address: '10.0.0.5', family: 4 }]);
      fetchMock.mockResolvedValueOnce(
        new Response('fake-image-bytes', {
          status: 200,
          headers: { 'content-type': 'image/png' },
        }),
      );

      await expect(
        service.resolveImageUrls([
          'https://example.com/first.png',
          'https://internal.example.com/second.png',
        ]),
      ).rejects.toThrow(BadRequestException);

      expect(unlinkMock).toHaveBeenCalledTimes(1);
    });
  });

  describe('cleanup', () => {
    it('removes every given file path, ignoring individual failures', async () => {
      unlinkMock
        .mockResolvedValueOnce(undefined)
        .mockRejectedValueOnce(new Error('already gone'));

      await service.cleanup(['/uploads/a.jpg', '/uploads/b.jpg']);

      expect(unlinkMock).toHaveBeenCalledTimes(2);
    });
  });
});
