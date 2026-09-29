// ponytail: whitelist regex — cukup untuk materi teks sederhana; ganti ke DOMPurify bila butuh tabel/gambar kompleks.
const ALLOWED_TAGS = new Set(['p', 'br', 'b', 'strong', 'i', 'em', 'u', 'a', 'ul', 'ol', 'li', 'h1', 'h2', 'h3', 'h4', 'blockquote', 'code', 'pre', 'table', 'thead', 'tbody', 'tr', 'th', 'td', 'span', 'div'])
const ALLOWED_ATTRS = new Set(['href', 'target', 'rel', 'colspan', 'rowspan'])

function escapeAttr(v: string) { return v.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;') }

function sanitizeTag(full: string, rawTag: string, rawAttrs: string | undefined): string {
  const tag = rawTag.toLowerCase()
  if (!ALLOWED_TAGS.has(tag)) return ''
  if (full.startsWith('</')) return `</${tag}>`
  let out = `<${tag}`
  let href = ''
  let external = false
  let blank = false
  if (rawAttrs) {
    const attrRe = /([a-z0-9-:]+)\s*=\s*("[^"]*"|'[^']*'|[^\s"'`=<>`]+)/gi
    let m: RegExpExecArray | null
    while ((m = attrRe.exec(rawAttrs))) {
      const name = (m[1] ?? '').toLowerCase()
      const val = (m[2] ?? '').replace(/^["']|["']$/g, '')
      if (name.startsWith('on') || name === 'style') continue
      if (!ALLOWED_ATTRS.has(name)) continue
      const lower = val.trim().toLowerCase()
      if (lower.startsWith('javascript:') || lower.startsWith('data:text/html') || lower.startsWith('vbscript:')) continue
      if (name === 'href') {
        if (!(lower.startsWith('http://') || lower.startsWith('https://') || lower.startsWith('/') || lower.startsWith('#') || lower.startsWith('mailto:'))) continue
        href = ` href="${escapeAttr(val)}"`
        if (lower.startsWith('http')) external = true
      } else if (name === 'target') {
        if (lower === '_blank') blank = true
      } else {
        out += ` ${name}="${escapeAttr(val)}"`
      }
    }
  }
  out += href
  if (external || blank) out += ` target="_blank" rel="noopener"`
  return `${out}>`
}

export function sanitizeRichText(value: string): string {
  if (!value) return ''
  let s = value.replace(/<(script|style|iframe|object|embed|form|link|meta|base|svg|math)[^>]*>[\s\S]*?<\/\1>/gi, '')
  s = s.replace(/<\/?(script|style|iframe|object|embed|form|link|meta|base|svg|math)[^>]*>/gi, '')
  return s.replace(/<\/?([a-z0-9]+)(\s[^>]*)?>/gi, (full: string, rawTag: string, rawAttrs: string | undefined) => sanitizeTag(full, rawTag, rawAttrs))
}
