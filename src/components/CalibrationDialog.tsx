import { useState } from 'react'
import { computePixelsPerMetre, distance } from '../lib/coords'
import type { LengthUnit } from '../lib/types'
import { useProjectStore } from '../store/useProjectStore'

export function CalibrationDialog() {
  const pending = useProjectStore((s) => s.pendingCalibration)
  const clear = useProjectStore((s) => s.clearPendingCalibration)
  const setCalibration = useProjectStore((s) => s.setCalibration)
  const setActiveTool = useProjectStore((s) => s.setActiveTool)
  const [realDistance, setRealDistance] = useState('')
  const [unit, setUnit] = useState<LengthUnit>('m')

  if (!pending) return null

  const pixelDistance = distance(pending.pointA, pending.pointB)
  const parsed = Number.parseFloat(realDistance)
  const valid = Number.isFinite(parsed) && parsed > 0

  function handleConfirm() {
    if (!pending || !valid) return
    const pixelsPerMetre = computePixelsPerMetre(pending.pointA, pending.pointB, parsed, unit)
    setCalibration(pending.sheetId, {
      pointA: pending.pointA,
      pointB: pending.pointB,
      realDistance: parsed,
      unit,
      pixelsPerMetre,
      calibratedAt: new Date().toISOString(),
    })
    clear()
    setActiveTool('select')
    setRealDistance('')
  }

  return (
    <div className="absolute inset-0 z-20 flex items-center justify-center bg-black/50">
      <div className="w-80 rounded-lg border border-[#2a2d35] bg-[#1c1f27] p-4 shadow-xl">
        <h2 className="mb-1 text-sm font-semibold text-[#e4e7ec]">Calibrate scale</h2>
        <p className="mb-3 text-xs text-[#8b93a3]">
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
              if (e.key === 'Enter' && valid) handleConfirm()
              if (e.key === 'Escape') {
                clear()
                setActiveTool('select')
              }
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
          <button
            className="rounded px-3 py-1.5 text-xs text-[#8b93a3] hover:bg-[#20232b]"
            onClick={() => {
              clear()
              setActiveTool('select')
            }}
          >
            Cancel
          </button>
          <button
            disabled={!valid}
            className="rounded bg-[#5b8def] px-3 py-1.5 text-xs font-semibold text-[#0b1220] hover:bg-[#79a3f2] disabled:opacity-40"
            onClick={handleConfirm}
          >
            Set scale
          </button>
        </div>
      </div>
    </div>
  )
}
