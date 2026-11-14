import * as XLSX from 'xlsx'
import { computeResult } from './measure'
import { buildItemSummary, buildSummary } from './summary'
import type { ItemPreset, Project } from './types'

function round(n: number | undefined, digits = 2): number | '' {
  if (n === undefined) return ''
  return Number(n.toFixed(digits))
}

export function exportWorkbook(project: Project, itemPresets: ItemPreset[] = []): void {
  const wb = XLSX.utils.book_new()
  const sheetsById = new Map(project.sheets.map((s) => [s.id, s]))
  const itemPresetsById = new Map(itemPresets.map((p) => [p.id, p]))

  // --- Summary tab: grouped by layer, with subtotals + grand totals ------
  const summary = buildSummary(project)
  const summaryRows: (string | number)[][] = [
    ['Bates Projects — Takeoff Summary'],
    ['Project', project.name],
    ['Exported', new Date().toLocaleString()],
    [],
    [
      'Layer',
      'Waste %',
      'Area (m²)',
      'Area incl. waste (m²)',
      'Volume (m³)',
      'Length (m)',
      'Length incl. waste (m)',
      'Count (no.)',
      'Count incl. waste (no.)',
    ],
  ]
  for (const ls of summary.layers) {
    if (ls.results.length === 0) continue
    summaryRows.push([
      ls.layer.name,
      ls.layer.wastePercent || '',
      round(ls.totals.areaM2) || '',
      ls.totals.areaM2WithWaste > ls.totals.areaM2 ? round(ls.totals.areaM2WithWaste) : '',
      round(ls.totals.volumeM3) || '',
      round(ls.totals.lengthM) || '',
      ls.totals.lengthMWithWaste > ls.totals.lengthM ? round(ls.totals.lengthMWithWaste) : '',
      ls.totals.count || '',
      ls.totals.countWithWaste > ls.totals.count ? ls.totals.countWithWaste : '',
    ])
  }
  summaryRows.push([])
  summaryRows.push([
    'PROJECT TOTAL',
    '',
    round(summary.grandTotals.areaM2) || '',
    summary.grandTotals.areaM2WithWaste > summary.grandTotals.areaM2 ? round(summary.grandTotals.areaM2WithWaste) : '',
    round(summary.grandTotals.volumeM3) || '',
    round(summary.grandTotals.lengthM) || '',
    summary.grandTotals.lengthMWithWaste > summary.grandTotals.lengthM ? round(summary.grandTotals.lengthMWithWaste) : '',
    summary.grandTotals.count || '',
    summary.grandTotals.countWithWaste > summary.grandTotals.count ? summary.grandTotals.countWithWaste : '',
  ])
  const summarySheet = XLSX.utils.aoa_to_sheet(summaryRows)
  summarySheet['!cols'] = [
    { wch: 24 },
    { wch: 9 },
    { wch: 12 },
    { wch: 14 },
    { wch: 12 },
    { wch: 12 },
    { wch: 14 },
    { wch: 12 },
    { wch: 16 },
  ]
  XLSX.utils.book_append_sheet(wb, summarySheet, 'Summary')

  // --- Items tab: every saved item preset in use, totalled across layers/sheets ---
  const itemSummary = buildItemSummary(project, itemPresets)
  if (itemSummary.length > 0) {
    const itemRows: (string | number)[][] = [
      ['Item', 'Cost code', 'Height (m)', 'Waste %', 'Count (no.)', 'Count incl. waste (no.)'],
    ]
    for (const row of itemSummary) {
      itemRows.push([
        row.preset.name,
        row.preset.costCode ?? '',
        round(row.preset.defaultHeightM) || '',
        row.preset.defaultWastePercent || '',
        row.count,
        row.countWithWaste > row.count ? row.countWithWaste : '',
      ])
    }
    const itemsSheet = XLSX.utils.aoa_to_sheet(itemRows)
    itemsSheet['!cols'] = [{ wch: 20 }, { wch: 14 }, { wch: 12 }, { wch: 9 }, { wch: 12 }, { wch: 18 }]
    XLSX.utils.book_append_sheet(wb, itemsSheet, 'Items')
  }

  // --- Raw measurements tab: one row per measurement ----------------------
  const header = [
    'Sheet',
    'Layer',
    'Type',
    'Label',
    'Item preset',
    'Cost code',
    'Length (m)',
    'Width (m)',
    'Height (m)',
    'Area (m²)',
    'Perimeter (m)',
    'Depth (m)',
    'Volume (m³)',
    'Radius (m)',
    'Pitch (°)',
    'Plan area (m²)',
    'Cut-outs removed (m²)',
    'Gross area (m²)',
    'Openings (m²)',
    'Count',
    'Count incl. waste',
    'Waste %',
    'Area incl. waste (m²)',
    'Length incl. waste (m)',
    'Calibrated',
    'Created',
  ]
  const rows: (string | number)[][] = [header]

  for (const m of project.measurements) {
    const sheet = sheetsById.get(m.sheetId)
    const layer = project.layers.find((l) => l.id === m.layerId)
    const result = computeResult(m, sheet, layer)
    const preset = m.type === 'count' && m.itemPresetId ? itemPresetsById.get(m.itemPresetId) : undefined
    rows.push([
      sheet?.name ?? '—',
      layer?.name ?? '—',
      m.type,
      m.label,
      preset?.name ?? '',
      preset?.costCode ?? '',
      m.type === 'length' || m.type === 'wall' ? round(result.lengthM) : m.type === 'radius' ? round(result.lengthM) : '',
      m.type === 'length' ? round(m.width) : '',
      m.type === 'wall' ? round(m.heightM) : m.type === 'count' ? round(m.heightM) : '',
      m.type === 'area' || m.type === 'length' || m.type === 'radius' || m.type === 'wall' ? round(result.areaM2) : '',
      m.type === 'area' ? round(result.perimeterM) : '',
      m.type === 'area' ? round(m.depth) : '',
      m.type === 'area' ? round(result.volumeM3) : '',
      m.type === 'radius' ? round(result.lengthM) : '',
      m.type === 'area' ? round(m.pitchDeg) : '',
      m.type === 'area' ? round(result.planAreaM2) : '',
      m.type === 'area' ? round(result.cutoutAreaM2) : '',
      m.type === 'wall' ? round(result.grossAreaM2) : '',
      m.type === 'wall' ? round(result.openingsAreaM2) : '',
      m.type === 'count' ? result.count ?? '' : '',
      m.type === 'count' && result.countWithWaste !== undefined ? result.countWithWaste : '',
      result.wastePercent || '',
      round(result.areaM2WithWaste),
      round(result.lengthMWithWaste),
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
