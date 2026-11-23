import { describe, it, expect } from 'vitest';
import { listChannels, saveChannel, publicChannels, CHANNELS, ChannelError } from '@/server/channels';

const blank = { handle: null, url: null, status: 'not_set' as const, showInFooter: true, notes: null };

describe('channels and connections', () => {
  it('lists every channel as not set on first open, without duplicates on reopen', async () => {
    const first = await listChannels();
    expect(first).toHaveLength(CHANNELS.length);
    expect(CHANNELS.length).toBe(17);
    expect(first.every((c) => c.status === 'not_set')).toBe(true);
    expect(await listChannels()).toHaveLength(17);
  });

  it('a saved handle moves a channel to "handle saved"', async () => {
    await saveChannel('instagram', { ...blank, handle: '@vikkaa.lk' });
    const ig = (await listChannels()).find((c) => c.key === 'instagram')!;
    expect(ig.status).toBe('handle_saved');
  });

  it('rejects unknown channels and non-web links', async () => {
    await expect(saveChannel('myspace', blank)).rejects.toThrow(ChannelError);
    await expect(saveChannel('instagram', { ...blank, url: 'javascript:alert(1)' })).rejects.toThrow(/https/);
    await expect(saveChannel('instagram', { ...blank, url: 'instagram.com/vikkaa' })).rejects.toThrow(/https/);
  });

  it('the footer shows only public channels that have a link and are not hidden', async () => {
    await saveChannel('facebook_page', { ...blank, url: 'https://facebook.com/vikkaa.lk' });
    await saveChannel('youtube', { ...blank, url: 'https://youtube.com/@vikkaa', showInFooter: false });
    await saveChannel('meta_ad_account', { ...blank, url: 'https://business.facebook.com/x' });
    await saveChannel('instagram', { ...blank, handle: '@vikkaa.lk' });
    expect(await publicChannels()).toEqual([{ key: 'facebook_page', label: 'Facebook', url: 'https://facebook.com/vikkaa.lk' }]);
  });
});
