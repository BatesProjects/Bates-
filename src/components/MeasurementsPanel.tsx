import { useState } from 'react'
import { buildSummary } from '../lib/summary'
import type { AreaMeasurement, Measurement, MeasurementResult, WallMeasurement, WallOpening } from '../lib/types'
import { makeId } from '../lib/id'
import { useProjectStore } from '../store/useProjectStore'

function fmt(n: number | undefined, digits = 2): string {
  if (n === undefined) return '—'
  return n.toFixed(digits)
}

function NumberField({
  value,
  onCommit,
  width = 'w-16',
  placeholder,
}: {
  value: number | undefined
  onCommit: (v: number | undefined) => void
  width?: string
  placeholder?: string
}) {
  return (
    <input
      type="number"
      min="0"
      step="any"
      defaultValue={value ?? ''}
      placeholder={placeholder}
      onClick={(e) => e.stopPropagation()}
      onBlur={(e) => {
        const v = Number.parseFloat(e.target.value)
        onCommit(Number.isFinite(v) && v >= 0 ? v : undefined)
      }}
      className={`${width} rounded bg-[#14161b] px-1 py-0.5 text-[#e4e7ec] outline-none ring-1 ring-[#333742]`}
    />
  )
}

function WasteOverrideField({ measurement }: { measurement: Measurement }) {
  const updateMeasurement = useProjectStore((s) => s.updateMeasurement)
  return (
    <label className="mt-1 flex items-center gap-1 text-[10px] text-[#8b93a3]" onClick={(e) => e.stopPropagation()}>
      Waste override (%):
      <NumberField
        value={measurement.wasteOverridePercent}
        placeholder="layer default"
        onCommit={(v) => updateMeasurement(measurement.id, { wasteOverridePercent: v } as Partial<Measurement>)}
      />
    </label>
  )
}

function WasteSummaryLine({ result, unit }: { result: MeasurementResult; unit: 'm²' | 'm' }) {
  const withWaste = unit === 'm²' ? result.areaM2WithWaste : result.lengthMWithWaste
  if (!result.wastePercent || withWaste === undefined) return null
  return (
    <div className="mt-0.5 text-[10px] text-[#8b93a3]">
      Incl. waste (+{result.wastePercent}%): <span className="text-[#c7cbd4]">{fmt(withWaste)} {unit}</span>
    </div>
  )
}

function CutoutsEditor({ measurement }: { measurement: AreaMeasurement }) {
  const updateMeasurement = useProjectStore((s) => s.updateMeasurement)
  const startCutout = useProjectStore((s) => s.startCutout)
  const project = useProjectStore((s) => s.project)
  const sheet = project?.sheets.find((s) => s.id === measurement.sheetId)
  const ppm = sheet?.calibration?.pixelsPerMetre ?? 0
  const cutouts = measurement.cutouts ?? []

  function removeCutout(id: string) {
    updateMeasurement(measurement.id, { cutouts: cutouts.filter((c) => c.id !== id) } as Partial<Measurement>)
  }

  return (
    <div className="mt-1.5" onClick={(e) => e.stopPropagation()}>
      <div className="flex items-center justify-between">
        <span className="text-[10px] text-[#8b93a3]">Cut-outs</span>
        <button
          onClick={() => startCutout(measurement.id)}
          className="rounded border border-[#333742] px-1.5 py-0.5 text-[10px] text-[#c7cbd4] hover:border-[#5b8def]"
        >
          + Add cut-out
        </button>
      </div>
      {cutouts.length > 0 && ppm > 0 && (
        <div className="mt-1 flex flex-col gap-0.5">
          {cutouts.map((c, i) => {
            // Shoelace area, computed inline since we only need a quick per-item readout here.
            let sum = 0
            for (let k = 0; k < c.points.length; k++) {
              const a = c.points[k]
              const b = c.points[(k + 1) % c.points.length]
              sum += a.x * b.y - b.x * a.y
            }
            const areaM2 = Math.abs(sum) / 2 / (ppm * ppm)
            return (
              <div key={c.id} className="flex items-center justify-between text-[10px] text-[#8b93a3]">
                <span>Cut-out {i + 1}: −{fmt(areaM2)} m²</span>
                <button onClick={() => removeCutout(c.id)} className="text-[#8b93a3] hover:text-[#c0392b]">
                  ×
                </button>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

function WallOpeningsEditor({ measurement }: { measurement: WallMeasurement }) {
  const updateMeasurement = useProjectStore((s) => s.updateMeasurement)
  const [widthDraft, setWidthDraft] = useState('')
  const [heightDraft, setHeightDraft] = useState('')

  function addOpening() {
    const width = Number.parseFloat(widthDraft)
    const height = Number.parseFloat(heightDraft)
    if (!Number.isFinite(width) || width <= 0 || !Number.isFinite(height) || height <= 0) return
    const opening: WallOpening = { id: makeId(), label: `${width}×${height}m`, width, height }
    updateMeasurement(measurement.id, { openings: [...measurement.openings, opening] } as Partial<Measurement>)
    setWidthDraft('')
    setHeightDraft('')
  }

  function removeOpening(id: string) {
    updateMeasurement(measurement.id, { openings: measurement.openings.filter((o) => o.id !== id) } as Partial<Measurement>)
  }

  return (
    <div className="mt-1.5" onClick={(e) => e.stopPropagation()}>
      <div className="text-[10px] text-[#8b93a3]">Door / window openings</div>
      {measurement.openings.length > 0 && (
        <div className="mt-1 flex flex-col gap-0.5">
          {measurement.openings.map((o) => (
            <div key={o.id} className="flex items-center justify-between text-[10px] text-[#8b93a3]">
              <span>
                {o.label} — {fmt(o.width * o.height)} m²
              </span>
              <button onClick={() => removeOpening(o.id)} className="text-[#8b93a3] hover:text-[#c0392b]">
                ×
              </button>
            </div>
          ))}
        </div>
      )}
      <div className="mt-1 flex items-center gap-1">
        <input
          type="number"
          min="0"
          step="any"
          placeholder="w (m)"
          value={widthDraft}
          onChange={(e) => setWidthDraft(e.target.value)}
          className="w-14 rounded bg-[#14161b] px-1 py-0.5 text-[10px] text-[#e4e7ec] outline-none ring-1 ring-[#333742]"
        />
        <span className="text-[10px] text-[#5b6270]">×</span>
        <input
          type="number"
          min="0"
          step="any"
          placeholder="h (m)"
          value={heightDraft}
          onChange={(e) => setHeightDraft(e.target.value)}
          className="w-14 rounded bg-[#14161b] px-1 py-0.5 text-[10px] text-[#e4e7ec] outline-none ring-1 ring-[#333742]"
        />
        <button
          onClick={addOpening}
          className="rounded border border-[#333742] px-1.5 py-0.5 text-[10px] text-[#c7cbd4] hover:border-[#5b8def]"
        >
          + Add
        </button>
      </div>
    </div>
  )
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
  } else if (m.type === 'wall') {
    valueText = `${fmt(result.areaM2)} m² net`
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
        <>
          <label className="mt-1 flex items-center gap-1 text-[10px] text-[#8b93a3]" onClick={(e) => e.stopPropagation()}>
            Depth (m):
            <NumberField value={m.depth} onCommit={(v) => updateMeasurement(m.id, { depth: v } as Partial<Measurement>)} />
          </label>
          <label className="mt-1 flex items-center gap-1 text-[10px] text-[#8b93a3]" onClick={(e) => e.stopPropagation()}>
            Roof/surface pitch (°):
            <NumberField
              value={m.pitchDeg}
              onCommit={(v) => updateMeasurement(m.id, { pitchDeg: v } as Partial<Measurement>)}
            />
          </label>
          {m.pitchDeg !== undefined && result.planAreaM2 !== undefined && (
            <div className="mt-0.5 text-[10px] text-[#8b93a3]">
              Plan: {fmt(result.planAreaM2)} m² → true: <span className="text-[#c7cbd4]">{fmt(result.areaM2)} m²</span>
            </div>
          )}
          {result.cutoutAreaM2 !== undefined && (
            <div className="mt-0.5 text-[10px] text-[#8b93a3]">Cut-outs removed: −{fmt(result.cutoutAreaM2)} m²</div>
          )}
          <CutoutsEditor measurement={m} />
          <WasteSummaryLine result={result} unit="m²" />
          <WasteOverrideField measurement={m} />
        </>
      )}

      {selected && m.type === 'length' && (
        <>
          <label className="mt-1 flex items-center gap-1 text-[10px] text-[#8b93a3]" onClick={(e) => e.stopPropagation()}>
            Width (m):
            <NumberField value={m.width} onCommit={(v) => updateMeasurement(m.id, { width: v } as Partial<Measurement>)} />
          </label>
          <WasteSummaryLine result={result} unit="m" />
          <WasteOverrideField measurement={m} />
        </>
      )}

      {selected && m.type === 'radius' && (
        <>
          <WasteSummaryLine result={result} unit="m²" />
          <WasteOverrideField measurement={m} />
        </>
      )}

      {selected && m.type === 'wall' && (
        <>
          <label className="mt-1 flex items-center gap-1 text-[10px] text-[#8b93a3]" onClick={(e) => e.stopPropagation()}>
            Height (m):
            <NumberField
              value={m.heightM}
              onCommit={(v) => updateMeasurement(m.id, { heightM: v ?? 2.4 } as Partial<Measurement>)}
            />
          </label>
          <div className="mt-0.5 text-[10px] text-[#8b93a3]">
            Gross: {fmt(result.grossAreaM2)} m² − openings {fmt(result.openingsAreaM2)} m² ={' '}
            <span className="text-[#c7cbd4]">{fmt(result.areaM2)} m² net</span>
          </div>
          <WallOpeningsEditor measurement={m} />
          <WasteSummaryLine result={result} unit="m²" />
          <WasteOverrideField measurement={m} />
        </>
      )}
    </div>
  )
}

export function MeasurementsPanel() {
  const project = useProjectStore((s) => s.project)
  const toggleLayerCollapsed = useProjectStore((s) => s.toggleLayerCollapsed)
  const setAllLayersCollapsed = useProjectStore((s) => s.setAllLayersCollapsed)
  if (!project) return null

  const summary = buildSummary(project)
  const gt = summary.grandTotals
  const nonEmptyLayers = summary.layers.filter((ls) => ls.results.length > 0)
  const anyExpanded = nonEmptyLayers.some((ls) => !ls.layer.collapsed)

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="flex items-center justify-between border-b border-[#2a2d35] px-3 py-2">
        <span className="text-[11px] font-semibold uppercase tracking-wide text-[#6d7686]">
          Takeoff summary
        </span>
        {nonEmptyLayers.length > 1 && (
          <button
            onClick={() => setAllLayersCollapsed(anyExpanded)}
            className="text-[10px] text-[#6d7686] hover:text-[#c7cbd4]"
          >
            {anyExpanded ? 'Collapse all' : 'Expand all'}
          </button>
        )}
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
                <button
                  onClick={() => toggleLayerCollapsed(ls.layer.id)}
                  className="mb-1 flex w-full items-center gap-1.5 rounded px-0.5 py-0.5 text-left hover:bg-[#1c1f27]"
                  title={ls.layer.collapsed ? 'Expand layer' : 'Collapse layer'}
                >
                  <svg
                    width="10"
                    height="10"
                    viewBox="0 0 24 24"
                    fill="none"
                    className={`shrink-0 text-[#6d7686] transition-transform ${ls.layer.collapsed ? '-rotate-90' : ''}`}
                  >
                    <path d="M6 9l6 6 6-6" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                  <span className="h-2 w-2 shrink-0 rounded-full" style={{ backgroundColor: ls.layer.color }} />
                  <span className="text-[11px] font-medium text-[#c7cbd4]">{ls.layer.name}</span>
                  {!!ls.layer.wastePercent && (
                    <span className="rounded bg-[#20232b] px-1 text-[9px] text-[#8b93a3]">+{ls.layer.wastePercent}% waste</span>
                  )}
                  <span className="flex-1" />
                  <span className="text-[10px] text-[#6d7686]">
                    {ls.totals.areaM2 > 0 && `${fmt(ls.totals.areaM2)} m² `}
                    {ls.totals.lengthM > 0 && `${fmt(ls.totals.lengthM)} m `}
                    {ls.totals.volumeM3 > 0 && `${fmt(ls.totals.volumeM3)} m³ `}
                    {ls.totals.count > 0 && `${ls.totals.count} no.`}
                  </span>
                </button>
                {(ls.totals.areaM2WithWaste > ls.totals.areaM2 || ls.totals.lengthMWithWaste > ls.totals.lengthM) && (
                  <div className="mb-1 px-0.5 text-right text-[9px] text-[#6d7686]">
                    incl. waste:{' '}
                    {ls.totals.areaM2WithWaste > ls.totals.areaM2 && `${fmt(ls.totals.areaM2WithWaste)} m² `}
                    {ls.totals.lengthMWithWaste > ls.totals.lengthM && `${fmt(ls.totals.lengthMWithWaste)} m`}
                  </div>
                )}
                {!ls.layer.collapsed && (
                  <div className="flex flex-col gap-0.5">
                    {ls.results.map((r) => (
                      <ResultRow key={r.measurement.id} result={r} />
                    ))}
                  </div>
                )}
              </div>
            ),
        )}
      </div>

      <div className="border-t border-[#2a2d35] px-3 py-2 text-[11px] text-[#c7cbd4]">
        <div className="mb-1 font-semibold uppercase tracking-wide text-[#6d7686]">Project totals</div>
        <div className="flex flex-col gap-0.5 text-[#aab0bb]">
          {gt.areaM2 > 0 && (
            <div>
              Area: {fmt(gt.areaM2)} m²
              {gt.areaM2WithWaste > gt.areaM2 && <span className="text-[#6d7686]"> ({fmt(gt.areaM2WithWaste)} m² incl. waste)</span>}
            </div>
          )}
          {gt.volumeM3 > 0 && <div>Volume: {fmt(gt.volumeM3)} m³</div>}
          {gt.lengthM > 0 && (
            <div>
              Length: {fmt(gt.lengthM)} m
              {gt.lengthMWithWaste > gt.lengthM && <span className="text-[#6d7686]"> ({fmt(gt.lengthMWithWaste)} m incl. waste)</span>}
            </div>
          )}
          {gt.count > 0 && <div>Count: {gt.count} no.</div>}
        </div>
      </div>
    </div>
  )
}
