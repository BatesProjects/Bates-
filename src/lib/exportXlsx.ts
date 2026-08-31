import * as XLSX from 'xlsx'
import { computeResult } from './measure'
import { buildSummary } from './summary'
import type { Project } from './types'

function round(n: number | undefined, digits = 2): number | '' {
  if (n === undefined) return ''
  return Number(n.toFixed(digits))
}

export function exportWorkbook(project: Project): void {
  const wb = XLSX.utils.book_new()
  const sheetsById = new Map(project.sheets.map((s) => [s.id, s]))

  // --- Summary tab: grouped by layer, with subtotals + grand totals ------
  const summary = buildSummary(project)
  const summaryRows: (string | number)[][] = [
    ['Bates Projects — Takeoff Summary'],
    ['Project', project.name],
    ['Exported', new Date().toLocaleString()],
    [],
    ['Layer', 'Area (m²)', 'Volume (m³)', 'Length (m)', 'Count (no.)'],
  ]
  for (const ls of summary.layers) {
    if (ls.results.length === 0) continue
    summaryRows.push([
      ls.layer.name,
      round(ls.totals.areaM2) || '',
      round(ls.totals.volumeM3) || '',
      round(ls.totals.lengthM) || '',
      ls.totals.count || '',
    ])
  }
  summaryRows.push([])
  summaryRows.push([
    'PROJECT TOTAL',
    round(summary.grandTotals.areaM2) || '',
    round(summary.grandTotals.volumeM3) || '',
    round(summary.grandTotals.lengthM) || '',
    summary.grandTotals.count || '',
  ])
  const summarySheet = XLSX.utils.aoa_to_sheet(summaryRows)
  summarySheet['!cols'] = [{ wch: 24 }, { wch: 12 }, { wch: 12 }, { wch: 12 }, { wch: 12 }]
  XLSX.utils.book_append_sheet(wb, summarySheet, 'Summary')

  // --- Raw measurements tab: one row per measurement ----------------------
  const header = [
    'Sheet',
    'Layer',
    'Type',
    'Label',
    'Length (m)',
    'Width (m)',
    'Area (m²)',
    'Perimeter (m)',
    'Depth (m)',
    'Volume (m³)',
    'Radius (m)',
    'Count',
    'Calibrated',
    'Created',
  ]
  const rows: (string | number)[][] = [header]

  for (const m of project.measurements) {
    const sheet = sheetsById.get(m.sheetId)
    const layer = project.layers.find((l) => l.id === m.layerId)
    const result = computeResult(m, sheet)
    rows.push([
      sheet?.name ?? '—',
      layer?.name ?? '—',
      m.type,
      m.label,
      m.type === 'length' ? round(result.lengthM) : '',
      m.type === 'length' ? round(m.width) : '',
      m.type === 'area' || m.type === 'length' || m.type === 'radius' ? round(result.areaM2) : '',
      m.type === 'area' || m.type === 'radius' ? round(result.perimeterM) : '',
      m.type === 'area' ? round(m.depth) : '',
      m.type === 'area' ? round(result.volumeM3) : '',
      m.type === 'radius' ? round(result.lengthM) : '',
      m.type === 'count' ? 1 : '',
      result.uncalibrated ? 'No' : 'Yes',
      new Date(m.createdAt).toLocaleString(),
    ])
  }
  const measurementsSheet = XLSX.utils.aoa_to_sheet(rows)
  measurementsSheet['!cols'] = header.map((h) => ({ wch: Math.max(12, h.length + 2) }))
  XLSX.utils.book_append_sheet(wb, measurementsSheet, 'Raw Measurements')

  const filename = `${project.name.trim().toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '') || 'project'}-takeoff.xlsx`
  XLSX.writeFile(wb, filename)
}
