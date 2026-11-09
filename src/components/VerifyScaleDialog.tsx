import { useState } from 'react'
import { computePixelsPerMetre, distance, pxToM, toMetres } from '../lib/coords'
import type { LengthUnit } from '../lib/types'
import { useProjectStore } from '../store/useProjectStore'

export function VerifyScaleDialog() {
  const project = useProjectStore((s) => s.project)
  const pending = useProjectStore((s) => s.pendingVerify)
  const clear = useProjectStore((s) => s.clearPendingVerify)
  const setCalibration = useProjectStore((s) => s.setCalibration)
  const setActiveTool = useProjectStore((s) => s.setActiveTool)
  const [expected, setExpected] = useState('')
  const [unit, setUnit] = useState<LengthUnit>('m')
  const [checked, setChecked] = useState(false)

  if (!pending) return null

  const sheet = project?.sheets.find((s) => s.id === pending.sheetId)
  const ppm = sheet?.calibration?.pixelsPerMetre ?? 0
  const pixelDistance = distance(pending.pointA, pending.pointB)
  const measuredM = pxToM(pixelDistance, ppm)

  const parsed = Number.parseFloat(expected)
  const valid = Number.isFinite(parsed) && parsed > 0
  const expectedM = valid ? toMetres(parsed, unit) : 0
  const errorPct = checked && valid && expectedM > 0 ? ((measuredM - expectedM) / expectedM) * 100 : null

  function close() {
    clear()
    setActiveTool('select')
    setExpected('')
    setChecked(false)
  }

  function recalibrate() {
    if (!valid || !pending) return
    const newPpm = computePixelsPerMetre(pending.pointA, pending.pointB, parsed, unit)
    setCalibration(pending.sheetId, {
      pointA: pending.pointA,
      pointB: pending.pointB,
      realDistance: parsed,
      unit,
      pixelsPerMetre: newPpm,
      calibratedAt: new Date().toISOString(),
    })
    close()
  }

  const errorColor =
    errorPct === null
      ? '#c7cbd4'
      : Math.abs(errorPct) < 1
        ? '#4ade80'
        : Math.abs(errorPct) < 3
          ? '#e8a53d'
          : '#f87171'

  return (
    <div className="absolute inset-0 z-20 flex items-center justify-center bg-black/50">
      <div className="w-80 rounded-lg border border-[#2a2d35] bg-[#1c1f27] p-4 shadow-xl">
        <h2 className="mb-1 text-sm font-semibold text-[#e4e7ec]">Verify scale</h2>
        <p className="mb-3 text-xs text-[#8b93a3]">
          Using the current scale, that dimension measures{' '}
          <span className="font-medium text-[#c7cbd4]">{measuredM.toFixed(3)}m</span>. What should it actually be?
        </p>
        <div className="mb-3 flex gap-2">
          <input
            autoFocus
            type="number"
            min="0"
            step="any"
            value={expected}
            onChange={(e) => {
              setExpected(e.target.value)
              setChecked(false)
            }}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && valid) setChecked(true)
              if (e.key === 'Escape') close()
            }}
            placeholder="e.g. 5.00"
            className="flex-1 rounded bg-[#14161b] px-2 py-1.5 text-sm text-[#e4e7ec] outline-none ring-1 ring-[#333742] focus:ring-[#5b8def]"
          />
          <select
            value={unit}
            onChange={(e) => {
              setUnit(e.target.value as LengthUnit)
              setChecked(false)
            }}
            className="rounded bg-[#14161b] px-2 py-1.5 text-sm text-[#e4e7ec] outline-none ring-1 ring-[#333742]"
          >
            <option value="m">m</option>
            <option value="mm">mm</option>
          </select>
        </div>

        {errorPct !== null && (
          <div className="mb-3 rounded border border-[#333742] bg-[#14161b] p-2.5 text-xs">
            <div className="flex items-center justify-between">
              <span className="text-[#8b93a3]">Error</span>
              <span className="font-semibold" style={{ color: errorColor }}>
                {errorPct > 0 ? '+' : ''}
                {errorPct.toFixed(2)}%
              </span>
            </div>
            <div className="mt-1 text-[10px] text-[#6d7686]">
              {Math.abs(errorPct) < 1
                ? "That's well within normal click precision — the scale looks right."
                : errorPct > 0
                  ? 'The current scale reads this dimension too long.'
                  : 'The current scale reads this dimension too short.'}
            </div>
          </div>
        )}

        <div className="flex justify-end gap-2">
          <button className="rounded px-3 py-1.5 text-xs text-[#8b93a3] hover:bg-[#20232b]" onClick={close}>
            Close
          </button>
          {errorPct !== null && Math.abs(errorPct) >= 1 && (
            <button
              className="rounded border border-[#333742] px-3 py-1.5 text-xs text-[#c7cbd4] hover:border-[#5b8def]"
              onClick={recalibrate}
            >
              Use this as the new scale
            </button>
          )}
          <button
            disabled={!valid}
            className="rounded bg-[#5b8def] px-3 py-1.5 text-xs font-semibold text-[#0b1220] hover:bg-[#79a3f2] disabled:opacity-40"
            onClick={() => setChecked(true)}
          >
            Check
          </button>
        </div>
      </div>
    </div>
  )
}
