// app/utils/imageCompress.ts
// Kompresi gambar di sisi client sebelum di-upload: perkecil dimensi &
// encode ulang ke WebP (fallback PNG/JPEG). Tujuan: hemat bandwidth & storage.
//
// Catatan: hanya memproses raster (JPEG/PNG/WebP). SVG & GIF dilewati agar
// vektor tidak rusak dan animasi GIF tidak hilang.

export interface CompressImageOptions {
  maxWidth?: number
  maxHeight?: number
  quality?: number
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.onload = () => resolve(img)
    img.onerror = () => reject(new Error('Gagal membaca gambar'))
    img.src = src
  })
}

function canvasToBlob(canvas: HTMLCanvasElement, type: string, quality: number): Promise<Blob | null> {
  return new Promise((resolve) => canvas.toBlob(resolve, type, quality))
}

function extFromMime(mime: string): string {
  if (mime === 'image/webp') return 'webp'
  if (mime === 'image/png') return 'png'
  return 'jpg'
}

/**
 * Kompres gambar. Mengembalikan File baru yang lebih kecil, atau File asli
 * bila tidak ada manfaat / format tidak didukung.
 */
export async function compressImage(file: File, opts: CompressImageOptions = {}): Promise<File> {
  const { maxWidth = 1600, maxHeight = 1600, quality = 0.82 } = opts

  // Hanya raster yang aman diproses canvas.
  if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) return file
  if (typeof document === 'undefined') return file

  const url = URL.createObjectURL(file)
  try {
    const img = await loadImage(url)
    const scale = Math.min(1, maxWidth / img.width, maxHeight / img.height)
    const width = Math.max(1, Math.round(img.width * scale))
    const height = Math.max(1, Math.round(img.height * scale))

    const canvas = document.createElement('canvas')
    canvas.width = width
    canvas.height = height
    const ctx = canvas.getContext('2d')
    if (!ctx) return file
    ctx.drawImage(img, 0, 0, width, height)

    // WebP lebih hemat; bila browser tidak mendukung, toBlob otomatis fallback.
    const blob = await canvasToBlob(canvas, 'image/webp', quality)
    if (!blob || blob.size >= file.size) return file

    const name = `${file.name.replace(/\.[^.]+$/, '')}.${extFromMime(blob.type)}`
    return new File([blob], name, { type: blob.type })
  } catch {
    return file
  } finally {
    URL.revokeObjectURL(url)
  }
}
