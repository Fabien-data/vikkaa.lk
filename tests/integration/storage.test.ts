import { describe, it, expect } from 'vitest';
import { existsSync } from 'node:fs';
import { join } from 'node:path';
import sharp from 'sharp';
import { putPublicImage, putPrivate, readPrivate, sha256 } from '@/server/storage';

describe('storage', () => {
  it('putPublicImage writes two webp sizes and returns srcSet', async () => {
    const png = await sharp({ create: { width: 2400, height: 1200, channels: 3, background: '#336699' } }).png().toBuffer();
    const photo = await putPublicImage('assets/test/photo1', png);
    expect(photo).toEqual({
      src: '/media/assets/test/photo1-1600.webp',
      srcSet: '/media/assets/test/photo1-640.webp 640w, /media/assets/test/photo1-1600.webp 1600w',
    });
    const big = join('./storage-test/public/media/assets/test/photo1-1600.webp');
    expect(existsSync(big)).toBe(true);
    expect((await sharp(big).metadata()).width).toBe(1600);
    expect((await sharp('./storage-test/public/media/assets/test/photo1-640.webp').metadata()).format).toBe('webp');
  });

  it('round-trips private files and hashes them', async () => {
    await putPrivate('documents/t/x.pdf', Buffer.from('%PDF-test'));
    const back = await readPrivate('documents/t/x.pdf');
    expect(back.toString()).toBe('%PDF-test');
    expect(sha256(back)).toMatch(/^[a-f0-9]{64}$/);
  });

  it('rejects path traversal keys', async () => {
    await expect(putPrivate('../escape.txt', Buffer.from('x'))).rejects.toThrow();
    await expect(putPrivate('/abs.txt', Buffer.from('x'))).rejects.toThrow();
    await expect(readPrivate('documents/../../etc/passwd')).rejects.toThrow();
  });
});
