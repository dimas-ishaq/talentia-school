// pptx-browser tidak menyediakan tipe resmi. Hanya API yang dipakai PresentationViewer.
declare module 'pptx-browser' {
  export default class PptxRenderer {
    slideCount: number
    load(data: ArrayBuffer, onProgress?: (percent: number, message: string) => void): Promise<void>
    renderSlide(index: number, canvas: HTMLCanvasElement, width: number): Promise<void>
    destroy(): void
  }
}
