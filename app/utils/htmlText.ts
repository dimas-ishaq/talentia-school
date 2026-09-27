// app/utils/htmlText.ts — ubah HTML kaya (hasil TipTap) jadi teks polos untuk
// preview satu baris, validasi panjang, dan pembanding string.

const BLOCK_TAGS = /<\/(p|div|li|h[1-6]|blockquote|tr)>/gi

export function stripHtml(value: string): string {
  return (value || '')
    .replace(/<br\s*\/?>/gi, ' ')
    .replace(BLOCK_TAGS, ' ')
    .replace(/<[^>]+>/g, '')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/\s+/g, ' ')
    .trim()
}
