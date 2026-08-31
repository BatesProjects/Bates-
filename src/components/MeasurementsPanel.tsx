import { useState } from 'react'
import { buildSummary } from '../lib/summary'
import type { Measurement, MeasurementResult } from '../lib/types'
import { useProjectStore } from '../store/useProjectStore'

function fmt(n: number | undefined, digits = 2): string {
  if (n === undefined) return '—'
  return n.toFixed(digits)
}

function ResultRow({ result }: { result: MeasurementResult }) {
  const selectedId = useProjectStore((s) => s.selectedMeasurementId)
  const selectMeasurement = useProjectStore((s) => s.selectMeasurement)
  const deleteMeasurement = useProjectStore((s) => s.deleteMeasurement)
  const renameMeasurement = useProjectStore((s) => s.renameMeasurement)
  const updateMeasurement = useProjectStore((s) => s.updateMeasurement)
  const setActiveSheet = useProjectStore((s) => s.setActiveSheet)
  const project = useProjectStore((s) => s.project)
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState('')

  const m = result.measurement
  const selected = selectedId === m.id

  function focusMeasurement() {
    if (project && project.activeSheetId !== m.sheetId) setActiveSheet(m.sheetId)
    selectMeasurement(m.id)
  }

  let valueText = ''
  if (m.type === 'area') {
    valueText = `${fmt(result.areaM2)} m²`
    if (result.volumeM3 !== undefined) valueText += ` · ${fmt(result.volumeM3)} m³`
  } else if (m.type === 'length') {
    valueText = `${fmt(result.lengthM)} m`
    if (result.areaM2 !== undefined) valueText += ` · ${fmt(result.areaM2)} m²`
  } else if (m.type === 'count') {
    valueText = `${result.count ?? 0} no.`
  } else if (m.type === 'radius') {
    valueText = `r=${fmt(result.lengthM)}m · ${fmt(result.areaM2)} m²`
  }

  return (
    <div
      onClick={focusMeasurement}
      className={`group cursor-pointer rounded px-1.5 py-1 text-xs ${
        selected ? 'bg-[#243040] ring-1 ring-[#5b8def]' : 'hover:bg-[#1c1f27]'
      }`}
    >
      <div className="flex items-center gap-1.5">
        {editing ? (
          <input
            autoFocus
            className="min-w-0 flex-1 rounded bg-[#14161b] px-1 text-[#e4e7ec] outline-none ring-1 ring-[#5b8def]"
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onClick={(e) => e.stopPropagation()}
            onBlur={() => {
              if (draft.trim()) renameMeasurement(m.id, draft.trim())
              setEditing(false)
            }}
            onKeyDown={(e) => {
              if (e.key === 'Enter') e.currentTarget.blur()
              if (e.key === 'Escape') setEditing(false)
            }}
          />
        ) : (
          <span
            className="min-w-0 flex-1 truncate text-[#c7cbd4]"
            onDoubleClick={(e) => {
              e.stopPropagation()
              setDraft(m.label)
              setEditing(true)
            }}
          >
            {m.label}
          </span>
        )}
        <span className="shrink-0 text-[#8b93a3]">{valueText}</span>
        <button
          onClick={(e) => {
            e.stopPropagation()
            deleteMeasurement(m.id)
          }}
          className="hidden shrink-0 text-[#8b93a3] hover:text-[#c0392b] group-hover:inline"
          title="Delete"
        >
          ×
        </button>
      </div>
      {result.uncalibrated && (
        <div className="mt-0.5 text-[10px] text-[#e8a53d]">Sheet not calibrated — values are in raw pixels</div>
      )}
      {selected && m.type === 'area' && (
        <label
          className="mt-1 flex items-center gap-1 text-[10px] text-[#8b93a3]"
          onClick={(e) => e.stopPropagation()}
        >
          Depth (m):
          <input
            type="number"
            min="0"
            step="any"
            defaultValue={m.depth ?? ''}
            onBlur={(e) => {
              const v = Number.parseFloat(e.target.value)
              updateMeasurement(m.id, { depth: Number.isFinite(v) && v > 0 ? v : undefined } as Partial<Measurement>)
            }}
            className="w-16 rounded bg-[#14161b] px-1 py-0.5 text-[#e4e7ec] outline-none ring-1 ring-[#333742]"
          />
        </label>
      )}
      {selected && m.type === 'length' && (
        <label
          className="mt-1 flex items-center gap-1 text-[10px] text-[#8b93a3]"
          onClick={(e) => e.stopPropagation()}
        >
          Width (m):
          <input
            type="number"
            min="0"
            step="any"
            defaultValue={m.width ?? ''}
            onBlur={(e) => {
              const v = Number.parseFloat(e.target.value)
              updateMeasurement(m.id, { width: Number.isFinite(v) && v > 0 ? v : undefined } as Partial<Measurement>)
            }}
            className="w-16 rounded bg-[#14161b] px-1 py-0.5 text-[#e4e7ec] outline-none ring-1 ring-[#333742]"
          />
        </label>
      )}
    </div>
  )
}

export function MeasurementsPanel() {
  const project = useProjectStore((s) => s.project)
  if (!project) return null

  const summary = buildSummary(project)
  const gt = summary.grandTotals

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="border-b border-[#2a2d35] px-3 py-2">
        <span className="text-[11px] font-semibold uppercase tracking-wide text-[#6d7686]">
          Takeoff summary
        </span>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto px-2 py-2">
        {summary.layers.every((l) => l.results.length === 0) && (
          <div className="px-1 py-4 text-center text-[11px] leading-relaxed text-[#5b6270]">
            Draw a measurement with a tool from the left rail — it will show up here grouped by layer.
          </div>
        )}
        {summary.layers.map(
          (ls) =>
            ls.results.length > 0 && (
              <div key={ls.layer.id} className="mb-3">
                <div className="mb-1 flex items-center gap-1.5 px-0.5">
                  <span className="h-2 w-2 rounded-full" style={{ backgroundColor: ls.layer.color }} />
                  <span className="text-[11px] font-medium text-[#c7cbd4]">{ls.layer.name}</span>
                  <span className="flex-1" />
                  <span className="text-[10px] text-[#6d7686]">
                    {ls.totals.areaM2 > 0 && `${fmt(ls.totals.areaM2)} m² `}
                    {ls.totals.lengthM > 0 && `${fmt(ls.totals.lengthM)} m `}
                    {ls.totals.volumeM3 > 0 && `${fmt(ls.totals.volumeM3)} m³ `}
                    {ls.totals.count > 0 && `${ls.totals.count} no.`}
                  </span>
                </div>
                <div className="flex flex-col gap-0.5">
                  {ls.results.map((r) => (
                    <ResultRow key={r.measurement.id} result={r} />
                  ))}
                </div>
              </div>
            ),
        )}
      </div>

      <div className="border-t border-[#2a2d35] px-3 py-2 text-[11px] text-[#c7cbd4]">
        <div className="mb-1 font-semibold uppercase tracking-wide text-[#6d7686]">Project totals</div>
        <div className="flex flex-col gap-0.5 text-[#aab0bb]">
          {gt.areaM2 > 0 && <div>Area: {fmt(gt.areaM2)} m²</div>}
          {gt.volumeM3 > 0 && <div>Volume: {fmt(gt.volumeM3)} m³</div>}
          {gt.lengthM > 0 && <div>Length: {fmt(gt.lengthM)} m</div>}
          {gt.count > 0 && <div>Count: {gt.count} no.</div>}
        </div>
      </div>
    </div>
  )
}
