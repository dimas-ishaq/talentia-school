export type VideoProvider = 'youtube' | 'vimeo' | 'direct'

export type VideoMetadata = {
  provider: VideoProvider
  url: string
  embedUrl: string | null
  videoId: string | null
  title: string | null
  thumbnailUrl: string | null
  authorName: string | null
}

export type VideoInfo = VideoMetadata

export function parseVideoUrl(raw: string): VideoMetadata | null {
  let url: URL
  try { url = new URL(raw.trim()) } catch { return null }
  if (url.protocol !== 'https:' && url.protocol !== 'http:') return null
  const host = url.hostname.toLowerCase().replace(/^www\./, '')
  let videoId = ''
  if (host === 'youtu.be') videoId = url.pathname.slice(1).split('/')[0] || ''
  else if (host === 'youtube.com' || host === 'youtube-nocookie.com' || host === 'm.youtube.com' || host === 'music.youtube.com') videoId = url.searchParams.get('v') || url.pathname.match(/\/shorts\/([^/]+)/)?.[1] || url.pathname.match(/\/embed\/([^/]+)/)?.[1] || url.pathname.match(/\/live\/([^/]+)/)?.[1] || ''
  if (videoId) return { provider: 'youtube', url: url.toString(), videoId, embedUrl: `https://www.youtube-nocookie.com/embed/${encodeURIComponent(videoId)}`, title: null, thumbnailUrl: `https://img.youtube.com/vi/${encodeURIComponent(videoId)}/hqdefault.jpg`, authorName: null }
  if (host === 'vimeo.com' || host === 'player.vimeo.com') {
    videoId = url.pathname.match(/\/(\d+)(?:$|\/)/)?.[1] || ''
    if (videoId) return { provider: 'vimeo', url: url.toString(), videoId, embedUrl: `https://player.vimeo.com/video/${videoId}`, title: null, thumbnailUrl: null, authorName: null }
  }
  if (/\.(mp4|webm|mov)(?:$|[?#])/i.test(url.pathname)) return { provider: 'direct', url: url.toString(), videoId: null, embedUrl: null, title: null, thumbnailUrl: null, authorName: null }
  return null
}

export function mergeVideoMetadata(base: VideoMetadata | null, extra: Partial<VideoMetadata>): VideoMetadata | null {
  if (!base) return null
  return { ...base, ...Object.fromEntries(Object.entries(extra).filter(([, value]) => value !== undefined)) } as VideoMetadata
}
