// Sanity check whitelist sanitizer. Jalankan: npx tsx scripts/check-sanitize.ts
import assert from 'node:assert/strict'
import { sanitizeRichText } from '../server/utils/richText'

const cases: [string, string][] = [
  ['<script>alert(1)</script><p>ok</p>', '<p>ok</p>'],
  ['<img src=x onerror=alert(1)>', ''],
  ['<a href="javascript:alert(1)">x</a>', '<a>x</a>'],
  ['<a href="JaVaScRiPt:alert(1)">x</a>', '<a>x</a>'],
  ['<a href="https://a.com" target="_blank">x</a>', '<a href="https://a.com" target="_blank" rel="noopener">x</a>'],
  ['<a href="/local">x</a>', '<a href="/local">x</a>'],
  ['<div style="background:url(javascript:1)" onclick="x()">t</div>', '<div>t</div>'],
  ['<svg><script>alert(1)</script></svg>', ''],
  ['<iframe src="//evil"></iframe><p>y</p>', '<p>y</p>'],
  ['<p onclick="steal()">teks</p>', '<p>teks</p>'],
  ['<b>tebal</b><script>x</script>', '<b>tebal</b>'],
  ['<a href="data:text/html;base64,PHNjcmlwdD4=">d</a>', '<a>d</a>'],
  ['<a href="vbscript:msgbox">v</a>', '<a>v</a>'],
  ['<p title="x" onmouseover="y()">t</p>', '<p>t</p>'],
]

let failed = 0
for (const [input, expected] of cases) {
  const actual = sanitizeRichText(input)
  try {
    assert.equal(actual, expected)
  } catch {
    failed++
    console.error(`FAIL\n  input:    ${input}\n  expected: ${expected}\n  actual:   ${actual}`)
  }
}

if (failed) {
  console.error(`\n${failed}/${cases.length} gagal`)
  process.exit(1)
}
console.log(`OK ${cases.length}/${cases.length} sanitizeRichText`)
