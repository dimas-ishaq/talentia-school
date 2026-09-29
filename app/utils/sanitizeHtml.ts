// app/utils/sanitizeHtml.ts — whitelist minimal; server adalah sumber kebenaran (server/utils/richText.ts)
const ALLOWED = new Set(['p','br','b','strong','i','em','u','a','ul','ol','li','h1','h2','h3','h4','blockquote','code','pre','table','thead','tbody','tr','th','td','span','div'])
export function sanitizeHtml(value: string): string {
  if (!value) return ''
  let s = value.replace(/<(script|style|iframe|object|embed|form|link|meta|base|svg|math)[^>]*>[\s\S]*?<\/\1>/gi, '')
  s = s.replace(/<\/?(script|style|iframe|object|embed|form|link|meta|base|svg|math)[^>]*>/gi, '')
  return s.replace(/<\/?([a-z0-9]+)(\s[^>]*)?>/gi, (full, tag: string) => {
    const t = tag.toLowerCase()
    if (!ALLOWED.has(t)) return ''
    if (full.startsWith('</')) return `</${t}>`
    // buang semua atribut di client (href dll sudah disanitasi server)
    return `<${t}>`
  })
}