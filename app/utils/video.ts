export type VideoProvider = 'youtube' | 'vimeo' | 'direct'
export type VideoMetadata = { provider: VideoProvider; url: string; embedUrl: string | null; videoId: string | null; title: string | null; thumbnailUrl: string | null; authorName: string | null }
export type VideoInfo = VideoMetadata

export function parseVideoUrl(raw: string): VideoMetadata | null {
  let url: URL
  try { url = new URL(raw.trim()) } catch { return null }
  if (!['https:', 'http:'].includes(url.protocol)) return null
  const host = url.hostname.toLowerCase().replace(/^www\./, '')
  let videoId = ''
  if (host === 'youtu.be') videoId = url.pathname.slice(1).split('/')[0] || ''
  else if (['youtube.com', 'youtube-nocookie.com', 'm.youtube.com', 'music.youtube.com'].includes(host)) videoId = url.searchParams.get('v') || url.pathname.match(/\/(?:shorts|embed|live)\/([^/]+)/)?.[1] || ''
  if (videoId) return { provider: 'youtube', url: url.toString(), videoId, embedUrl: `https://www.youtube-nocookie.com/embed/${encodeURIComponent(videoId)}`, title: null, thumbnailUrl: `https://img.youtube.com/vi/${encodeURIComponent(videoId)}/hqdefault.jpg`, authorName: null }
  if (['vimeo.com', 'player.vimeo.com'].includes(host)) {
    videoId = url.pathname.match(/\/(\d+)(?:$|\/)/)?.[1] || ''
    if (videoId) return { provider: 'vimeo', url: url.toString(), videoId, embedUrl: `https://player.vimeo.com/video/${videoId}`, title: null, thumbnailUrl: null, authorName: null }
  }
  if (/\.(mp4|webm|mov)(?:$|[?#])/i.test(url.pathname)) return { provider: 'direct', url: url.toString(), videoId: null, embedUrl: null, title: null, thumbnailUrl: null, authorName: null }
  return null
}
