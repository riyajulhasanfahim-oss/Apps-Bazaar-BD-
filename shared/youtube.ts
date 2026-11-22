export interface ShortVideoItem {
  id: string;
  title: string;
  thumbnailUrl: string;
  youtubeUrl: string;
}

export interface DemoVideoItem {
  title: string;
  description: string;
  thumbnailUrl: string;
  youtubeUrl: string;
}

const YOUTUBE_ID_REGEX = /^[A-Za-z0-9_-]{11}$/;

/**
 * Extracts a validated 11-character YouTube video ID from standard watch,
 * youtu.be, shorts, live, or embed URLs. Returns null if invalid.
 */
export function extractYouTubeVideoId(rawUrl: string): string | null {
  const trimmed = rawUrl.trim();
  if (!trimmed) return null;

  let parsed: URL;
  try {
    parsed = new URL(trimmed);
  } catch {
    return null;
  }

  if (parsed.protocol !== 'https:' && parsed.protocol !== 'http:') {
    return null;
  }

  const host = parsed.hostname.toLowerCase().replace(/^www\./, '');
  let candidate: string | null = null;

  if (host === 'youtu.be') {
    candidate = parsed.pathname.split('/').filter(Boolean)[0] ?? null;
  } else if (
    host === 'youtube.com' ||
    host === 'm.youtube.com' ||
    host === 'youtube-nocookie.com'
  ) {
    const segments = parsed.pathname.split('/').filter(Boolean);
    if (segments[0] === 'shorts' || segments[0] === 'embed' || segments[0] === 'live') {
      candidate = segments[1] ?? null;
    } else if (parsed.pathname === '/watch' || segments[0] === 'watch') {
      candidate = parsed.searchParams.get('v');
    } else if (parsed.searchParams.get('v')) {
      candidate = parsed.searchParams.get('v');
    }
  }

  if (!candidate) return null;
  return YOUTUBE_ID_REGEX.test(candidate) ? candidate : null;
}

export function getYouTubeEmbedUrl(rawUrl: string, autoplay = true): string | null {
  const id = extractYouTubeVideoId(rawUrl);
  if (!id) return null;
  const params = new URLSearchParams({
    autoplay: autoplay ? '1' : '0',
    rel: '0',
    playsinline: '1',
    modestbranding: '1',
  });
  return `https://www.youtube.com/embed/${id}?${params.toString()}`;
}

export function getDefaultYouTubeThumbnail(rawUrl: string): string | null {
  const id = extractYouTubeVideoId(rawUrl);
  return id ? `https://i.ytimg.com/vi/${id}/hqdefault.jpg` : null;
}

export function isValidMediaImageUrl(rawUrl: string): boolean {
  const trimmed = rawUrl.trim();
  if (!trimmed || trimmed.length > 1000) return false;
  if (trimmed.startsWith('/') && !trimmed.startsWith('//')) return true;
  try {
    const parsed = new URL(trimmed);
    return parsed.protocol === 'https:' || parsed.protocol === 'http:';
  } catch {
    return false;
  }
}
