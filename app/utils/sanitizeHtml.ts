// app/utils/sanitizeHtml.ts — sanitasi HTML materi sebelum ditampilkan via v-html
export function sanitizeHtml(value: string): string {
  return (value || '')
    .replace(/<(script|style|iframe|object|embed|form|input|button|video|audio)[^>]*>[\s\S]*?<\/\1>/gi, '')
    .replace(/<\/?(script|style|iframe|object|embed|form|input|button|video|audio)[^>]*>/gi, '')
    .replace(/\s+on[a-z]+\s*=\s*("[^"]*"|'[^']*'|[^\s>]+)/gi, '')
    .replace(/(href|src)\s*=\s*("|')\s*javascript:[^"']*("|')/gi, '$1="#"')
}