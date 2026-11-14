import { makeId } from './id'
import type { Layer, Measurement, Project } from './types'

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

export const MARKER_SHAPES = ['circle', 'square', 'triangle', 'diamond'] as const

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

/**
 * Projects saved before the count tool supported grouped items stored a
 * single `point` per measurement. Upgrades that to the current `points`
 * array shape (one marker, same effect) so old saved projects keep opening.
 */
export function migrateProject(project: Project): Project {
  let changed = false
  const measurements = project.measurements.map((m) => {
    if (m.type === 'count' && !Array.isArray((m as unknown as { points?: unknown }).points)) {
      changed = true
      const legacyPoint = (m as unknown as { point: { x: number; y: number } }).point
      const { point: _point, ...rest } = m as unknown as Record<string, unknown>
      return { ...rest, points: [legacyPoint] } as Measurement
    }
    return m
  })
  return changed ? { ...project, measurements } : project
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
