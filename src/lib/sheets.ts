import { putBlob } from './db'
import { makeId } from './id'
import { canvasToBlob, isPdfFile, loadImageFile, renderPdfPages } from './pdf'
import type { Sheet } from './types'

/** Splits an uploaded file (PDF or image) into one or more persisted Sheet records. */
export async function ingestFile(file: File, projectId: string, startOrder: number): Promise<Sheet[]> {
  const now = new Date().toISOString()

  if (isPdfFile(file)) {
    const pages = await renderPdfPages(file)
    const baseName = file.name.replace(/\.pdf$/i, '')
    const sheets: Sheet[] = []
    for (const page of pages) {
      const blob = await canvasToBlob(page.canvas)
      const imageBlobKey = makeId()
      await putBlob(imageBlobKey, blob)
      sheets.push({
        id: makeId(),
        projectId,
        name: pages.length > 1 ? `${baseName} — Page ${page.pageNumber}` : baseName,
        order: startOrder + sheets.length,
        width: page.width,
        height: page.height,
        imageBlobKey,
        calibration: null,
        createdAt: now,
      })
    }
    return sheets
  }

  const { blob, width, height } = await loadImageFile(file)
  const imageBlobKey = makeId()
  await putBlob(imageBlobKey, blob)
  const name = file.name.replace(/\.[a-z0-9]+$/i, '')
  return [
    {
      id: makeId(),
      projectId,
      name,
      order: startOrder,
      width,
      height,
      imageBlobKey,
      calibration: null,
      createdAt: now,
    },
  ]
}

export function isSupportedUpload(file: File): boolean {
  return isPdfFile(file) || file.type.startsWith('image/')
}
