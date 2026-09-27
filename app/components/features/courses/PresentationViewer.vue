<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, shallowRef, watch } from 'vue'
import type {
  PDFDocumentProxy,
  PDFPageProxy,
  RenderTask,
} from 'pdfjs-dist/types/src/display/api'

type Props = {
  src: string
  title?: string
  originalUrl?: string | null
  externalUrl?: string | null
  fallbackMessage?: string
  fullWidth?: boolean
}
const props = defineProps<Props>()

const container = ref<HTMLDivElement | null>(null)
const currentPage = ref(1)
const totalPages = ref(0)
const loading = ref(false)
const error = ref('')
const isFullscreen = ref(false)
const pdfDoc = shallowRef<PDFDocumentProxy | null>(null)
let renderTask: RenderTask | null = null

// Lebar kontainer slide saat ini (px). Dipakai untuk render dengan skala yang tepat.
const stageWidth = ref(0)
const stageEl = ref<HTMLDivElement | null>(null)
let resizeObserver: ResizeObserver | null = null
const SLIDE_ASPECT = 16 / 9 // Default PowerPoint widescreen

// ── PDF.js renderer (untuk .ppt yang sudah dikonversi ke PDF, atau fallback) ──

async function loadPdf(src: string) {
  cleanup()
  error.value = ''
  if (!src) {
    error.value = 'File presentasi belum tersedia.'
    return
  }
  loading.value = true
  try {
    const pdfjs = await import('pdfjs-dist')
    pdfjs.GlobalWorkerOptions.workerSrc = '/pdf.worker.min.mjs'
    const doc = await pdfjs.getDocument({ url: src, withCredentials: false }).promise
    pdfDoc.value = doc
    totalPages.value = doc.numPages
    currentPage.value = Math.min(Math.max(1, currentPage.value || 1), doc.numPages)
    await renderPage(currentPage.value)
  } catch (err) {
    const message = (err as Error).message || 'Gagal memuat presentasi.'
    error.value = message
    console.error('[PresentationViewer] gagal memuat PDF:', err)
  } finally {
    loading.value = false
  }
}

async function renderPage(page: number) {
  if (!pdfDoc.value || !container.value) return
  if (renderTask) {
    try { renderTask.cancel() } catch { /* ignore */ }
    renderTask = null
  }
  const pageObj: PDFPageProxy = await pdfDoc.value.getPage(page)
  const availableW = stageWidth.value || container.value.clientWidth || 960
  const scale = (availableW / pageObj.getViewport({ scale: 1 }).width) * (window.devicePixelRatio || 1)
  const viewport = pageObj.getViewport({ scale })
  const canvas = document.createElement('canvas')
  canvas.className = 'block max-h-full max-w-full rounded-lg bg-white shadow'
  canvas.width = Math.floor(viewport.width)
  canvas.height = Math.floor(viewport.height)
  canvas.style.width = `${Math.floor(viewport.width / (window.devicePixelRatio || 1))}px`
  canvas.style.height = `${Math.floor(viewport.height / (window.devicePixelRatio || 1))}px`
  container.value.replaceChildren(canvas)
  const ctx = canvas.getContext('2d')
  if (!ctx) return
  renderTask = pageObj.render({ canvasContext: ctx, viewport, canvas })
  try {
    await renderTask.promise
  } catch (err) {
    if ((err as Error).name !== 'RenderingCancelledException') throw err
  }
}

function cleanup() {
  if (renderTask) {
    try { renderTask.cancel() } catch { /* ignore */ }
    renderTask = null
  }
  if (pdfDoc.value) {
    try { void pdfDoc.value.destroy() } catch { /* ignore */ }
  }
  pdfDoc.value = null
  totalPages.value = 0
  currentPage.value = 1
}

// ── pptx-browser renderer (untuk .pptx langsung di browser) ──

const pptxCanvas = ref<HTMLCanvasElement | null>(null)
const pptxRenderer = shallowRef<any>(null)
const pptxSlideCount = ref(0)
const pptxCurrent = ref(0)
const pptxLoading = ref(false)
const pptxError = ref('')

function isPptxUrl(url: string) {
  return url.toLowerCase().endsWith('.pptx')
}

async function loadPptx(url: string) {
  if (!import.meta.client) return
  pptxLoading.value = true
  pptxError.value = ''
  pptxSlideCount.value = 0
  pptxCurrent.value = 0
  try {
    const { default: PptxRenderer } = await import('pptx-browser')
    const renderer = new PptxRenderer()
    pptxRenderer.value = renderer
    const res = await fetch(url)
    if (!res.ok) throw new Error(`HTTP ${res.status}`)
    const buf = await res.arrayBuffer()
    await renderer.load(buf, (p: number, msg: string) => {
      console.log('[pptx-browser]', p, msg)
    })
    pptxSlideCount.value = renderer.slideCount || 0
    if (pptxSlideCount.value > 0) {
      await renderer.renderSlide(0, pptxCanvas.value!, getRenderWidth())
      pptxCurrent.value = 0
    } else {
      throw new Error('File PPTX tidak memiliki slide.')
    }
  } catch (err) {
    pptxError.value = (err as Error).message || 'Gagal memuat PPTX.'
    console.error('[PresentationViewer] pptx-browser gagal:', err)
  } finally {
    pptxLoading.value = false
  }
}

async function renderPptxSlide(index: number) {
  if (!pptxRenderer.value || !pptxCanvas.value) return
  pptxLoading.value = true
  try {
    await pptxRenderer.value.renderSlide(index, pptxCanvas.value, getRenderWidth())
    pptxCurrent.value = index
  } catch (err) {
    pptxError.value = (err as Error).message || 'Gagal merender slide.'
  } finally {
    pptxLoading.value = false
  }
}

function pptxGoPrev() { if (pptxCurrent.value > 0) void renderPptxSlide(pptxCurrent.value - 1) }
function pptxGoNext() { if (pptxCurrent.value < pptxSlideCount.value - 1) void renderPptxSlide(pptxCurrent.value + 1) }

function cleanupPptx() {
  if (pptxRenderer.value) {
    try { pptxRenderer.value.destroy() } catch { /* ignore */ }
  }
  pptxRenderer.value = null
  pptxSlideCount.value = 0
  pptxCurrent.value = 0
}

function getRenderWidth() {
  const width = stageWidth.value || wrapper.value?.clientWidth || 1280
  return Math.max(320, Math.floor(width))
}

async function rerenderAfterResize() {
  if (isPptxMode.value && pptxRenderer.value && pptxCanvas.value) {
    await renderPptxSlide(pptxCurrent.value)
  } else if (isPdfMode.value && pdfDoc.value) {
    await renderPage(currentPage.value)
  }
}

// ── Shared / computed ──

const wrapper = ref<HTMLDivElement | null>(null)
const externalEmbedUrl = computed(() => {
  if (!props.externalUrl) return ''
  try {
    const url = new URL(props.externalUrl)
    if (url.hostname.includes('docs.google.com') && url.pathname.includes('/presentation/')) {
      url.pathname = url.pathname.replace(/\/edit(?:.*)?$/, '/embed')
      url.search = ''
      return url.toString()
    }
    if (url.hostname.includes('canva.com')) {
      url.searchParams.set('embed', 'true')
      return url.toString()
    }
    return props.externalUrl
  } catch { return '' }
})

// Fallback Microsoft Office Online Viewer untuk .ppt/.pptx tanpa konversi PDF
const officeViewerUrl = computed(() => {
  if (!props.originalUrl) return ''
  const ext = props.originalUrl.split('.').pop()?.toLowerCase()
  if (!ext || !['ppt', 'pptx'].includes(ext)) return ''
  if (!import.meta.client) return ''
  const absoluteUrl = new URL(props.originalUrl, window.location.href).toString()
  return `https://view.officeapps.live.com/op/embed.aspx?src=${encodeURIComponent(absoluteUrl)}`
})

// Tentukan mode viewer:
//   1. externalEmbedUrl (Google Slides / Canva)
//   2. pptx-browser (untuk .pptx dengan originalUrl)
//   3. pdfjs (src = PDF URL)
//   4. officeViewerUrl (fallback iframe)
const isPptxMode = computed(() => {
  if (externalEmbedUrl.value) return false
  return isPptxUrl(props.originalUrl || '') && !props.src
})

const isPdfMode = computed(() => {
  if (externalEmbedUrl.value) return false
  if (isPptxMode.value) return false
  return !!props.src
})

const isOfficeFallback = computed(() => {
  if (externalEmbedUrl.value) return false
  if (isPptxMode.value) return false
  if (isPdfMode.value) return false
  return !!officeViewerUrl.value
})

watch(() => props.src, (src) => {
  if (import.meta.client && isPdfMode.value) void loadPdf(src)
})

watch(() => props.originalUrl, (url) => {
  if (import.meta.client && isPptxMode.value && url) void loadPptx(url)
})

onMounted(() => {
  if (externalEmbedUrl.value) return
  if (isPptxMode.value && props.originalUrl) void loadPptx(props.originalUrl)
  else if (isPdfMode.value) void loadPdf(props.src)

  if (typeof ResizeObserver !== 'undefined' && stageEl.value) {
    resizeObserver = new ResizeObserver(() => {
      const newWidth = stageEl.value?.clientWidth || 0
      if (newWidth && Math.abs(newWidth - stageWidth.value) > 2) {
        stageWidth.value = newWidth
        void rerenderAfterResize()
      }
    })
    resizeObserver.observe(stageEl.value)
  } else {
    window.addEventListener('resize', rerenderAfterResize)
  }
  const onKey = (e: KeyboardEvent) => {
    if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return
    if (isPptxMode.value) {
      if (e.key === 'ArrowRight' || e.key === 'PageDown' || e.key === ' ') pptxGoNext()
      if (e.key === 'ArrowLeft' || e.key === 'PageUp') pptxGoPrev()
      if (e.key === 'Home') void renderPptxSlide(0)
      if (e.key === 'End') void renderPptxSlide(pptxSlideCount.value - 1)
    } else if (isPdfMode.value) {
      if (e.key === 'ArrowRight' || e.key === 'PageDown' || e.key === ' ') goNext()
      if (e.key === 'ArrowLeft' || e.key === 'PageUp') goPrev()
      if (e.key === 'Home') goTo(1)
      if (e.key === 'End') goTo(totalPages.value)
    }
    if (e.key.toLowerCase() === 'f') toggleFullscreen()
  }
  window.addEventListener('keydown', onKey)
  onBeforeUnmount(() => window.removeEventListener('keydown', onKey))
})
onBeforeUnmount(() => {
  if (resizeObserver) {
    try { resizeObserver.disconnect() } catch { /* ignore */ }
    resizeObserver = null
  } else {
    window.removeEventListener('resize', rerenderAfterResize)
  }
  cleanup()
  cleanupPptx()
})

async function goTo(page: number) {
  if (!pdfDoc.value) return
  const target = Math.max(1, Math.min(totalPages.value, page))
  currentPage.value = target
  await renderPage(target)
}
function goPrev() { if (currentPage.value > 1) void goTo(currentPage.value - 1) }
function goNext() { if (currentPage.value < totalPages.value) void goTo(currentPage.value + 1) }

async function toggleFullscreen() {
  const el = wrapper.value
  if (!el) return
  try {
    if (!document.fullscreenElement) {
      await el.requestFullscreen()
      isFullscreen.value = true
    } else {
      await document.exitFullscreen()
      isFullscreen.value = false
    }
  } catch { /* ignore */ }
}
</script>

<template>
  <div ref="wrapper" class="flex w-full min-w-0 flex-col gap-3 rounded-xl border border-slate-200 bg-slate-50 p-3 sm:p-4 dark:border-slate-700 dark:bg-slate-900/40" :class="isFullscreen && 'fixed inset-0 z-50 bg-white p-3 sm:p-6 dark:bg-slate-900'">
    <div class="flex flex-wrap items-center justify-between gap-2">
      <div class="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-300">
        <Icon name="heroicons:presentation-chart-bar" class="h-5 w-5 text-emerald-600" />
        <span class="font-semibold">{{ title || 'Presentasi' }}</span>
        <span v-if="totalPages || pptxSlideCount" class="rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-semibold text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300">
          Slide {{ isPptxMode ? pptxCurrent + 1 : currentPage }} / {{ isPptxMode ? pptxSlideCount : totalPages }}
        </span>
      </div>
      <div class="flex flex-wrap items-center gap-1.5">
        <button type="button" class="rounded-lg border border-slate-200 p-1.5 text-slate-500 hover:bg-slate-100 disabled:opacity-40 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800" :disabled="(isPptxMode ? pptxCurrent <= 0 : currentPage <= 1)" @click="isPptxMode ? pptxGoPrev() : goPrev()" title="Sebelumnya">
          <Icon name="heroicons:chevron-left" class="h-4 w-4" />
        </button>
        <input v-if="!isPptxMode" v-model.number="currentPage" type="number" min="1" :max="totalPages || 1" class="h-8 w-16 rounded-lg border border-slate-200 bg-white px-2 text-center text-sm dark:border-slate-700 dark:bg-slate-800" :disabled="!totalPages" @change="goTo(Number(currentPage))">
        <button type="button" class="rounded-lg border border-slate-200 p-1.5 text-slate-500 hover:bg-slate-100 disabled:opacity-40 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800" :disabled="(isPptxMode ? pptxCurrent >= pptxSlideCount - 1 : currentPage >= totalPages)" @click="isPptxMode ? pptxGoNext() : goNext()" title="Berikutnya">
          <Icon name="heroicons:chevron-right" class="h-4 w-4" />
        </button>
        <button type="button" class="rounded-lg border border-slate-200 px-2 py-1 text-xs font-semibold text-slate-600 hover:bg-slate-100 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800" @click="toggleFullscreen">
          <Icon :name="isFullscreen ? 'heroicons:arrows-pointing-in' : 'heroicons:arrows-pointing-out'" class="mr-1 inline h-4 w-4" />
          {{ isFullscreen ? 'Keluar' : 'Layar penuh' }}
        </button>
        <a v-if="originalUrl" :href="originalUrl" download class="rounded-lg border border-slate-200 px-2 py-1 text-xs font-semibold text-slate-600 hover:bg-slate-100 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800">
          <Icon name="heroicons:arrow-down-tray" class="mr-1 inline h-4 w-4" /> Download PPT
        </a>
      </div>
    </div>

    <!-- Mode 1: External embed (Google Slides / Canva) -->
    <div v-if="externalEmbedUrl" class="overflow-hidden rounded-lg bg-black">
      <iframe :src="externalEmbedUrl" :title="title || 'Presentasi'" class="h-[70vh] w-full" allowfullscreen />
    </div>

    <!-- Mode 2: pptx-browser (native .pptx renderer) -->
    <div v-else-if="isPptxMode" class="flex flex-col gap-2">
      <div v-if="pptxLoading && !pptxSlideCount" class="flex h-[60vh] items-center justify-center text-sm text-slate-500">Memuat presentasi...</div>
      <div v-else-if="pptxError" class="rounded-lg border border-amber-300 bg-amber-50 px-3 py-2 text-sm text-amber-800 dark:border-amber-700 dark:bg-amber-900/30 dark:text-amber-200">
        <p class="font-semibold">Pratinjau otomatis tidak tersedia.</p>
        <p class="mt-1 text-xs">{{ pptxError }}</p>
        <a v-if="originalUrl" :href="originalUrl" download class="mt-1 inline-block font-semibold text-amber-900 underline dark:text-amber-100">Unduh file asli</a>
      </div>
      <div v-else ref="stageEl" class="flex w-full min-w-0 items-center justify-center overflow-auto rounded-lg bg-slate-200 p-2 dark:bg-slate-800" :class="isFullscreen ? 'min-h-0 h-[calc(100vh-9rem)]' : 'min-h-[60vh]'">
        <canvas ref="pptxCanvas" class="block h-auto w-full max-w-full rounded-lg bg-white shadow" />
      </div>
    </div>

    <!-- Mode 3: PDF.js (konversi LibreOffice atau PDF langsung) -->
    <div v-else-if="isPdfMode">
      <div v-if="loading" class="flex h-[60vh] items-center justify-center text-sm text-slate-500">Memuat presentasi...</div>
      <div v-else-if="error" class="rounded-lg border border-amber-300 bg-amber-50 px-3 py-2 text-sm text-amber-800 dark:border-amber-700 dark:bg-amber-900/30 dark:text-amber-200">
        <p class="font-semibold">Pratinjau otomatis tidak tersedia.</p>
        <p class="mt-1 text-xs">{{ error }}</p>
        <a v-if="originalUrl" :href="originalUrl" download class="mt-1 inline-block font-semibold text-amber-900 underline dark:text-amber-100">Unduh file asli</a>
        <a v-if="externalUrl" :href="externalUrl" target="_blank" rel="noopener" class="ml-2 font-semibold text-amber-900 underline dark:text-amber-100">Buka di tab baru</a>
      </div>
      <div v-show="!loading && !error" ref="stageEl" class="flex w-full min-w-0 items-center justify-center overflow-auto rounded-lg bg-slate-200 p-2 dark:bg-slate-800" :class="isFullscreen ? 'min-h-0 h-[calc(100vh-9rem)]' : 'min-h-[60vh]'">
        <div ref="container" class="flex w-full min-w-0 items-center justify-center" />
      </div>
    </div>

    <!-- Mode 4: Office Online Viewer fallback -->
    <div v-else-if="isOfficeFallback" class="overflow-hidden rounded-lg bg-black">
      <iframe :src="officeViewerUrl" :title="title || 'Presentasi'" class="h-[70vh] w-full" allowfullscreen />
    </div>

    <!-- Mode 5: Tidak ada sumber sama sekali -->
    <div v-else class="flex h-[60vh] items-center justify-center rounded-lg border border-slate-200 bg-slate-100 text-sm text-slate-500 dark:border-slate-700 dark:bg-slate-800">
      File presentasi belum tersedia.
    </div>

    <p class="text-xs text-slate-400">Navigasi: ← / → untuk pindah slide, F untuk layar penuh.</p>
  </div>
</template>
