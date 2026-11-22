/** The privacy-friendly embed URL for a YouTube link (watch, youtu.be, shorts or embed), or null if it isn't one. */
export function youtubeEmbed(url: string | null | undefined): string | null {
  if (!url || !/^https:\/\/(www\.)?(youtube\.com|youtu\.be)\//.test(url)) return null;
  const id = url.match(/(?:youtu\.be\/|v=|shorts\/|embed\/)([\w-]{11})/)?.[1];
  return id ? `https://www.youtube-nocookie.com/embed/${id}` : null;
}
