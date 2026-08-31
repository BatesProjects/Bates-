import { getBlob, putBlob } from './db'
import { makeId } from './id'
import type { Project, Sheet } from './types'

const EXPORT_VERSION = 1

interface ExportedSheet extends Omit<Sheet, 'imageBlobKey'> {
  /** Base64 data URL of the sheet bitmap, embedded so the file is fully portable. */
  imageData: string | null
}

interface ExportedProject extends Omit<Project, 'sheets'> {
  sheets: ExportedSheet[]
}

interface ExportPayload {
  version: number
  exportedAt: string
  project: ExportedProject
}

function blobToDataUrl(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(reader.result as string)
    reader.onerror = () => reject(reader.error)
    reader.readAsDataURL(blob)
  })
}

async function dataUrlToBlob(dataUrl: string): Promise<Blob> {
  const res = await fetch(dataUrl)
  return res.blob()
}

function slugify(name: string): string {
  return name.trim().toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '') || 'project'
}

function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  a.remove()
  URL.revokeObjectURL(url)
}

export async function exportProjectJson(project: Project): Promise<void> {
  const sheets: ExportedSheet[] = await Promise.all(
    project.sheets.map(async (sheet) => {
      const blob = await getBlob(sheet.imageBlobKey)
      const imageData = blob ? await blobToDataUrl(blob) : null
      const { imageBlobKey: _imageBlobKey, ...rest } = sheet
      return { ...rest, imageData }
    }),
  )

  const payload: ExportPayload = {
    version: EXPORT_VERSION,
    exportedAt: new Date().toISOString(),
    project: { ...project, sheets },
  }

  const blob = new Blob([JSON.stringify(payload)], { type: 'application/json' })
  downloadBlob(blob, `${slugify(project.name)}.takeoff.json`)
}

export async function importProjectJson(file: File): Promise<Project> {
  const text = await file.text()
  const payload = JSON.parse(text) as ExportPayload
  if (!payload?.project?.sheets) throw new Error('Not a valid takeoff project file')

  const sheets: Sheet[] = await Promise.all(
    payload.project.sheets.map(async (exported) => {
      const { imageData, ...rest } = exported
      const imageBlobKey = makeId()
      if (imageData) {
        const blob = await dataUrlToBlob(imageData)
        await putBlob(imageBlobKey, blob)
      }
      return { ...rest, imageBlobKey }
    }),
  )

  return { ...payload.project, sheets }
}
