import { computeResult, measurementCentroid } from './measure'
import type { ItemPreset, Layer, Measurement, MeasurementResult, Point, Project } from './types'

export interface LayerSummary {
  layer: Layer
  results: MeasurementResult[]
  totals: {
    areaM2: number
    perimeterM: number
    lengthM: number
    volumeM3: number
    count: number
    /** Sum of each item's area inflated by its waste %, falling back to its plain area where no waste applies. */
    areaM2WithWaste: number
    lengthMWithWaste: number
    countWithWaste: number
  }
}

export interface ProjectSummary {
  layers: LayerSummary[]
  grandTotals: LayerSummary['totals']
}

/** One row per saved item preset that has at least one count group using it, totalled across every layer and sheet. */
export interface ItemSummaryRow {
  preset: ItemPreset
  count: number
  countWithWaste: number
  /** Every count group using this preset, so the UI can jump straight to one on a specific sheet. */
  groups: { measurementId: string; sheetId: string; sheetName: string; layerId: string; pointCount: number; centroid: Point }[]
  /** True when `preset` is a stand-in for an itemPresetId whose real preset was deleted (before markers were deleted with it) — these are otherwise-invisible leftover markers that still need somewhere to be found and removed. */
  orphaned?: boolean
}

function emptyTotals(): LayerSummary['totals'] {
  return { areaM2: 0, perimeterM: 0, lengthM: 0, volumeM3: 0, count: 0, areaM2WithWaste: 0, lengthMWithWaste: 0, countWithWaste: 0 }
}

function addInto(totals: LayerSummary['totals'], result: MeasurementResult) {
  if (result.measurement.type === 'area') {
    totals.areaM2 += result.areaM2 ?? 0
    totals.volumeM3 += result.volumeM3 ?? 0
    totals.areaM2WithWaste += result.areaM2WithWaste ?? result.areaM2 ?? 0
  } else if (result.measurement.type === 'length') {
    totals.lengthM += result.lengthM ?? 0
    totals.areaM2 += result.areaM2 ?? 0
    totals.lengthMWithWaste += result.lengthMWithWaste ?? result.lengthM ?? 0
  } else if (result.measurement.type === 'count') {
    totals.count += result.count ?? 0
    totals.countWithWaste += result.countWithWaste ?? result.count ?? 0
  } else if (result.measurement.type === 'radius') {
    totals.areaM2 += result.areaM2 ?? 0
    totals.perimeterM += result.perimeterM ?? 0
    totals.areaM2WithWaste += result.areaM2WithWaste ?? result.areaM2 ?? 0
  } else if (result.measurement.type === 'wall') {
    totals.areaM2 += result.areaM2 ?? 0
    totals.lengthM += result.lengthM ?? 0
    totals.areaM2WithWaste += result.areaM2WithWaste ?? result.areaM2 ?? 0
  }
}

export function buildSummary(project: Project, measurements?: Measurement[]): ProjectSummary {
  const source = measurements ?? project.measurements
  const sheetsById = new Map(project.sheets.map((s) => [s.id, s]))
  const grandTotals = emptyTotals()

  const layers: LayerSummary[] = [...project.layers]
    .sort((a, b) => a.order - b.order)
    .map((layer) => {
      const layerMeasurements = source.filter((m) => m.layerId === layer.id)
      const results = layerMeasurements.map((m) => computeResult(m, sheetsById.get(m.sheetId), layer))
      const totals = emptyTotals()
      for (const r of results) {
        addInto(totals, r)
        addInto(grandTotals, r)
      }
      return { layer, results, totals }
    })

  return { layers, grandTotals }
}

/** Groups every count measurement tied to a saved item preset, across all layers and sheets, into one row per item. */
export function buildItemSummary(project: Project, itemPresets: ItemPreset[]): ItemSummaryRow[] {
  const sheetsById = new Map(project.sheets.map((s) => [s.id, s]))
  const layersById = new Map(project.layers.map((l) => [l.id, l]))
  const totals = new Map<string, { count: number; countWithWaste: number; groups: ItemSummaryRow['groups'] }>()

  for (const m of project.measurements) {
    if (m.type !== 'count' || !m.itemPresetId) continue
    const result = computeResult(m, sheetsById.get(m.sheetId), layersById.get(m.layerId))
    const t = totals.get(m.itemPresetId) ?? { count: 0, countWithWaste: 0, groups: [] }
    t.count += result.count ?? 0
    t.countWithWaste += result.countWithWaste ?? result.count ?? 0
    t.groups.push({
      measurementId: m.id,
      sheetId: m.sheetId,
      sheetName: sheetsById.get(m.sheetId)?.name ?? '—',
      layerId: m.layerId,
      pointCount: m.points.length,
      centroid: measurementCentroid(m),
    })
    totals.set(m.itemPresetId, t)
  }

  const presetsById = new Map(itemPresets.map((p) => [p.id, p]))
  const rows: ItemSummaryRow[] = []
  for (const [presetId, t] of totals) {
    const preset = presetsById.get(presetId)
    if (preset) {
      rows.push({ preset, ...t })
    } else {
      // The preset behind this id no longer exists (deleted before its
      // markers were, under the old delete behaviour). Surface it anyway,
      // under whatever label its markers were created with, so it has
      // somewhere to be found and deleted from.
      const firstGroup = t.groups[0]
      const layer = firstGroup ? project.layers.find((l) => l.id === firstGroup.layerId) : undefined
      const label = project.measurements.find((m) => m.type === 'count' && m.itemPresetId === presetId)?.label ?? 'Deleted item'
      rows.push({
        preset: { id: presetId, name: label, color: layer?.color ?? '#8b93a3', markerShape: 'circle' },
        ...t,
        orphaned: true,
      })
    }
  }

  return rows.sort((a, b) => a.preset.name.localeCompare(b.preset.name))
}
