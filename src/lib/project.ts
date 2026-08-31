import { makeId } from './id'
import type { Layer, Project } from './types'

export const LAYER_PALETTE = [
  '#f97316', // orange
  '#38bdf8', // sky
  '#a3e635', // lime
  '#f472b6', // pink
  '#facc15', // yellow
  '#c084fc', // purple
  '#4ade80', // green
  '#fb7185', // rose
  '#60a5fa', // blue
  '#e879f9', // fuchsia
]

export function nextLayerColor(existing: Layer[]): string {
  return LAYER_PALETTE[existing.length % LAYER_PALETTE.length]
}

export function createDefaultLayer(projectId: string, order = 0): Layer {
  return {
    id: makeId(),
    projectId,
    name: 'Layer 1',
    color: LAYER_PALETTE[0],
    visible: true,
    locked: false,
    order,
  }
}

export function createProject(name: string): Project {
  const id = makeId()
  const defaultLayer = createDefaultLayer(id, 0)
  const now = new Date().toISOString()
  return {
    id,
    name,
    createdAt: now,
    updatedAt: now,
    sheets: [],
    layers: [defaultLayer],
    measurements: [],
    activeSheetId: null,
    activeLayerId: defaultLayer.id,
  }
}
