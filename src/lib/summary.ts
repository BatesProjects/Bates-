import { computeResult } from './measure'
import type { Layer, Measurement, MeasurementResult, Project } from './types'

export interface LayerSummary {
  layer: Layer
  results: MeasurementResult[]
  totals: {
    areaM2: number
    perimeterM: number
    lengthM: number
    volumeM3: number
    count: number
  }
}

export interface ProjectSummary {
  layers: LayerSummary[]
  grandTotals: LayerSummary['totals']
}

function emptyTotals(): LayerSummary['totals'] {
  return { areaM2: 0, perimeterM: 0, lengthM: 0, volumeM3: 0, count: 0 }
}

function addInto(totals: LayerSummary['totals'], result: MeasurementResult) {
  if (result.measurement.type === 'area') {
    totals.areaM2 += result.areaM2 ?? 0
    totals.volumeM3 += result.volumeM3 ?? 0
  } else if (result.measurement.type === 'length') {
    totals.lengthM += result.lengthM ?? 0
    totals.areaM2 += result.areaM2 ?? 0
  } else if (result.measurement.type === 'count') {
    totals.count += result.count ?? 0
  } else if (result.measurement.type === 'radius') {
    totals.areaM2 += result.areaM2 ?? 0
    totals.perimeterM += result.perimeterM ?? 0
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
      const results = layerMeasurements.map((m) => computeResult(m, sheetsById.get(m.sheetId)))
      const totals = emptyTotals()
      for (const r of results) {
        addInto(totals, r)
        addInto(grandTotals, r)
      }
      return { layer, results, totals }
    })

  return { layers, grandTotals }
}
