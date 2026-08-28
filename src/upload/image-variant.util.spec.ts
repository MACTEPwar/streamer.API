import { writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { IMAGE_VARIANT_WIDTHS_PX } from './constants/image-variant-widths.constant';

// Директория загрузок подменяется на временную: список вариантов проверяется
// по-настоящему существующим файлам, а не замоканному existsSync.
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
      nodePath.join(nodeOs.tmpdir(), 'uploads-variants-'),
    ),
  };
});

import { UPLOADS_DIR, UPLOADS_URL_PREFIX } from './constants/upload.constant';
import { listImageVariants, toVariantFilename } from './image-variant.util';

describe('toVariantFilename', () => {
  it('inserts the width before the extension', () => {
    expect(toVariantFilename('photo.jpg', 330)).toBe('photo-330w.jpg');
  });

  it('handles filenames without an extension', () => {
    expect(toVariantFilename('photo', 330)).toBe('photo-330w');
  });
});

describe('listImageVariants', () => {
  const createFile = (name: string) => {
    writeFileSync(join(UPLOADS_DIR, name), 'x');
  };

  it('returns only the variants that actually exist on disk', () => {
    const [first, second] = IMAGE_VARIANT_WIDTHS_PX;
    createFile(toVariantFilename('photo.jpg', first));

    const variants = listImageVariants(`${UPLOADS_URL_PREFIX}/photo.jpg`);

    expect(variants).toEqual([
      { width: first, url: `${UPLOADS_URL_PREFIX}/photo-${first}w.jpg` },
    ]);
    expect(variants.some((variant) => variant.width === second)).toBe(false);
  });

  it('returns nothing for an image with no variants on disk', () => {
    expect(listImageVariants(`${UPLOADS_URL_PREFIX}/no-variants.jpg`)).toEqual(
      [],
    );
  });

  it('returns nothing for an external address', () => {
    expect(listImageVariants('https://example.com/pic.png')).toEqual([]);
  });

  it('returns nothing for an empty address', () => {
    expect(listImageVariants(null)).toEqual([]);
    expect(listImageVariants(undefined)).toEqual([]);
  });
});
