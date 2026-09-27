// Auto-detect LibreOffice binary di berbagai platform
import { stat } from 'node:fs/promises'
import { join } from 'node:path'

const CANDIDATES: string[] = [
  // Linux/macOS (PATH)
  'soffice',
  'libreoffice',
  // macOS Homebrew
  '/Applications/LibreOffice.app/Contents/MacOS/soffice',
  '/opt/homebrew/bin/soffice',
  '/usr/local/bin/soffice',
  // Linux standar
  '/usr/bin/soffice',
  '/usr/lib/libreoffice/program/soffice',
  // Windows standar
  'C:\\Program Files\\LibreOffice\\program\\soffice.exe',
  'C:\\Program Files (x86)\\LibreOffice\\program\\soffice.exe',
  // Windows portable
  'C:\\LibreOffice\\program\\soffice.exe',
]

let cached: string | null | undefined

export async function findLibreOffice(): Promise<string | null> {
  if (cached !== undefined) return cached

  for (const bin of CANDIDATES) {
    try {
      await stat(bin)
      cached = bin
      return bin
    } catch {
      // coba dengan exec 'which' / 'where' untuk PATH-based
      if (!bin.includes('/') && !bin.includes('\\')) {
        try {
          const { execSync } = await import('node:child_process')
          const cmd = process.platform === 'win32' ? `where ${bin}` : `which ${bin}`
          const result = execSync(cmd, { encoding: 'utf-8', stdio: ['pipe', 'pipe', 'ignore'] }).trim().split('\n')[0]
          if (result) {
            cached = result.trim()
            return cached
          }
        } catch { /* ignore */ }
      }
    }
  }

  cached = null
  return null
}

export function resetLibreOfficeCache() {
  cached = undefined
}
