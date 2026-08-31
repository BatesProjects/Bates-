import * as pdfjsLib from 'pdfjs-dist'
import pdfWorkerUrl from 'pdfjs-dist/build/pdf.worker.min.mjs?url'

pdfjsLib.GlobalWorkerOptions.workerSrc = pdfWorkerUrl

/** Render resolution for PDF pages. Higher = crisper zoom-in, larger blobs. */
const RENDER_SCALE = 2.5

export interface RenderedPage {
  pageNumber: number
  canvas: HTMLCanvasElement
  width: number
  height: number
}

/** Renders every page of a PDF file to an offscreen canvas at RENDER_SCALE. */
export async function renderPdfPages(file: File): Promise<RenderedPage[]> {
  const data = await file.arrayBuffer()
  const loadingTask = pdfjsLib.getDocument({ data })
  const doc = await loadingTask.promise
  const pages: RenderedPage[] = []

  for (let pageNumber = 1; pageNumber <= doc.numPages; pageNumber++) {
    const page = await doc.getPage(pageNumber)
    const viewport = page.getViewport({ scale: RENDER_SCALE })

    const canvas = document.createElement('canvas')
    canvas.width = Math.ceil(viewport.width)
    canvas.height = Math.ceil(viewport.height)
    const ctx = canvas.getContext('2d')
    if (!ctx) throw new Error('Could not get 2D context for PDF render')

    await page.render({ canvasContext: ctx, viewport }).promise
    pages.push({ pageNumber, canvas, width: canvas.width, height: canvas.height })
  }

  await loadingTask.destroy()
  return pages
}

export function canvasToBlob(canvas: HTMLCanvasElement): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (blob) resolve(blob)
      else reject(new Error('canvas.toBlob returned null'))
    }, 'image/png')
  })
}

export interface LoadedImage {
  blob: Blob
  width: number
  height: number
}

export function loadImageFile(file: File): Promise<LoadedImage> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    const url = URL.createObjectURL(file)
    img.onload = () => {
      URL.revokeObjectURL(url)
      resolve({ blob: file, width: img.naturalWidth, height: img.naturalHeight })
    }
    img.onerror = () => {
      URL.revokeObjectURL(url)
      reject(new Error(`Could not load image: ${file.name}`))
    }
    img.src = url
  })
}

export function isPdfFile(file: File): boolean {
  return file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf')
}
