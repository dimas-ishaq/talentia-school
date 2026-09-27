// HTML minimal untuk materi. Buang script, event handler, dan URL javascript.
export function sanitizeRichText(value: string): string {
  return value
    .replace(/<\/?(script|style|iframe|object|embed|form|input|button)[^>]*>/gi, '')
    .replace(/\s+on[a-z]+\s*=\s*("[^"]*"|'[^']*'|[^\s>]+)/gi, '')
    .replace(/(href|src)\s*=\s*("|')\s*javascript:[^"']*("|')/gi, '$1="#"')
}
