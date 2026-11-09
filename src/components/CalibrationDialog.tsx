import { useState } from 'react'
import { computePixelsPerMetre, distance } from '../lib/coords'
import { PRESET_SCALE_RATIOS, formatScaleRatio, pixelsPerMetreForScale } from '../lib/scales'
import type { LengthUnit } from '../lib/types'
import { useProjectStore } from '../store/useProjectStore'

export function CalibrationDialog() {
  const project = useProjectStore((s) => s.project)
  const pending = useProjectStore((s) => s.pendingCalibration)
  const clearPending = useProjectStore((s) => s.clearPendingCalibration)
  const chooserOpen = useProjectStore((s) => s.calibrationChooserOpen)
  const closeChooser = useProjectStore((s) => s.closeCalibrationChooser)
  const setCalibration = useProjectStore((s) => s.setCalibration)
  const setActiveTool = useProjectStore((s) => s.setActiveTool)
  const [realDistance, setRealDistance] = useState('')
  const [unit, setUnit] = useState<LengthUnit>('m')

  if (!pending && !chooserOpen) return null

  const activeSheet = project?.sheets.find((s) => s.id === project.activeSheetId)
  const sourceDpi = activeSheet?.sourceDpi

  function closeEverything() {
    clearPending()
    setActiveTool('select')
    setRealDistance('')
  }

  function applyPreset(scaleRatio: number) {
    const sheetId = pending?.sheetId ?? activeSheet?.id
    if (!sheetId || !sourceDpi) return
    setCalibration(sheetId, {
      pointA: pending?.pointA ?? { x: 0, y: 0 },
      pointB: pending?.pointB ?? { x: 0, y: 0 },
      realDistance: 1,
      unit: 'm',
      pixelsPerMetre: pixelsPerMetreForScale(scaleRatio, sourceDpi),
      calibratedAt: new Date().toISOString(),
      scaleRatio,
    })
    closeEverything()
  }

  function handleConfirmDistance() {
    if (!pending) return
    const parsed = Number.parseFloat(realDistance)
    if (!Number.isFinite(parsed) || parsed <= 0) return
    const pixelsPerMetre = computePixelsPerMetre(pending.pointA, pending.pointB, parsed, unit)
    setCalibration(pending.sheetId, {
      pointA: pending.pointA,
      pointB: pending.pointB,
      realDistance: parsed,
      unit,
      pixelsPerMetre,
      calibratedAt: new Date().toISOString(),
    })
    closeEverything()
  }

  const parsed = Number.parseFloat(realDistance)
  const distanceValid = Number.isFinite(parsed) && parsed > 0
  const pixelDistance = pending ? distance(pending.pointA, pending.pointB) : 0

  return (
    <div className="absolute inset-0 z-20 flex items-center justify-center bg-black/50">
      <div className="w-96 rounded-lg border border-[#2a2d35] bg-[#1c1f27] p-4 shadow-xl">
        <h2 className="mb-1 text-sm font-semibold text-[#e4e7ec]">Calibrate scale</h2>

        {/* --- Preset architectural scale, no clicking required ------------- */}
        <div className="mb-3">
          <p className="mb-1.5 text-xs text-[#8b93a3]">
            {sourceDpi
              ? 'If this sheet is plotted at a standard scale, pick it directly:'
              : "This sheet was uploaded as an image, so its print scale isn't known — pick a preset only if you're sure, or measure a known dimension below."}
          </p>
          <div className="flex flex-wrap gap-1.5">
            {PRESET_SCALE_RATIOS.map((ratio) => (
              <button
                key={ratio}
                disabled={!sourceDpi}
                onClick={() => applyPreset(ratio)}
                className="rounded border border-[#333742] px-2 py-1 text-xs text-[#c7cbd4] hover:border-[#5b8def] hover:text-[#e4e7ec] disabled:cursor-not-allowed disabled:opacity-30 disabled:hover:border-[#333742]"
              >
                {formatScaleRatio(ratio)}
              </button>
            ))}
          </div>
        </div>

        <div className="my-3 flex items-center gap-2 text-[10px] uppercase tracking-wide text-[#5b6270]">
          <div className="h-px flex-1 bg-[#2a2d35]" />
          or
          <div className="h-px flex-1 bg-[#2a2d35]" />
        </div>

        {/* --- Two-point measure flow ---------------------------------------- */}
        {pending ? (
          <>
            <p className="mb-2 text-xs text-[#8b93a3]">
              You measured {pixelDistance.toFixed(1)} px on the drawing. Enter the real-world distance it
              represents.
            </p>
            <div className="mb-3 flex gap-2">
              <input
                autoFocus
                type="number"
                min="0"
                step="any"
                value={realDistance}
                onChange={(e) => setRealDistance(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && distanceValid) handleConfirmDistance()
                  if (e.key === 'Escape') closeEverything()
                }}
                placeholder="e.g. 3.6"
                className="flex-1 rounded bg-[#14161b] px-2 py-1.5 text-sm text-[#e4e7ec] outline-none ring-1 ring-[#333742] focus:ring-[#5b8def]"
              />
              <select
                value={unit}
                onChange={(e) => setUnit(e.target.value as LengthUnit)}
                className="rounded bg-[#14161b] px-2 py-1.5 text-sm text-[#e4e7ec] outline-none ring-1 ring-[#333742]"
              >
                <option value="m">m</option>
                <option value="mm">mm</option>
              </select>
            </div>
            <div className="flex justify-end gap-2">
              <button className="rounded px-3 py-1.5 text-xs text-[#8b93a3] hover:bg-[#20232b]" onClick={closeEverything}>
                Cancel
              </button>
              <button
                disabled={!distanceValid}
                className="rounded bg-[#5b8def] px-3 py-1.5 text-xs font-semibold text-[#0b1220] hover:bg-[#79a3f2] disabled:opacity-40"
                onClick={handleConfirmDistance}
              >
                Set scale
              </button>
            </div>
          </>
        ) : (
          <>
            <p className="mb-3 text-xs text-[#8b93a3]">
              Click the two ends of a dimension shown on the drawing, then enter what it's meant to measure.
            </p>
            <div className="flex justify-end gap-2">
              <button className="rounded px-3 py-1.5 text-xs text-[#8b93a3] hover:bg-[#20232b]" onClick={closeEverything}>
                Cancel
              </button>
              <button
                className="rounded bg-[#5b8def] px-3 py-1.5 text-xs font-semibold text-[#0b1220] hover:bg-[#79a3f2]"
                onClick={closeChooser}
              >
                Measure two points on the drawing
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
