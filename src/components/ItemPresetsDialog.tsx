import { useState } from 'react'
import { LAYER_PALETTE, MARKER_SHAPES } from '../lib/project'
import type { ItemPreset } from '../lib/types'
import { useProjectStore } from '../store/useProjectStore'

function shapeLabel(shape: ItemPreset['markerShape']): string {
  return shape.charAt(0).toUpperCase() + shape.slice(1)
}

function PresetRow({ preset }: { preset: ItemPreset }) {
  const updateItemPreset = useProjectStore((s) => s.updateItemPreset)
  const deleteItemPresetAndMarkers = useProjectStore((s) => s.deleteItemPresetAndMarkers)
  const project = useProjectStore((s) => s.project)
  const [colorPickerOpen, setColorPickerOpen] = useState(false)

  const markerCount =
    project?.measurements.reduce(
      (sum, m) => sum + (m.type === 'count' && m.itemPresetId === preset.id ? m.points.length : 0),
      0,
    ) ?? 0

  return (
    <div className="relative mb-2 rounded border border-[#2a2d35] bg-[#191b21] p-2">
      <div className="flex items-center gap-1.5">
        <button
          className="h-4 w-4 shrink-0 rounded-full ring-1 ring-black/30"
          style={{ backgroundColor: preset.color }}
          title="Change colour"
          onClick={() => setColorPickerOpen((v) => !v)}
        />
        <input
          defaultValue={preset.name}
          onBlur={(e) => {
            const name = e.target.value.trim()
            if (name) updateItemPreset(preset.id, { name })
          }}
          className="min-w-0 flex-1 rounded bg-[#14161b] px-1.5 py-1 text-xs text-[#e4e7ec] outline-none ring-1 ring-[#333742] focus:ring-[#5b8def]"
        />
        <select
          value={preset.markerShape}
          onChange={(e) => updateItemPreset(preset.id, { markerShape: e.target.value as ItemPreset['markerShape'] })}
          className="rounded bg-[#14161b] px-1 py-1 text-xs text-[#e4e7ec] outline-none ring-1 ring-[#333742]"
        >
          {MARKER_SHAPES.map((s) => (
            <option key={s} value={s}>
              {shapeLabel(s)}
            </option>
          ))}
        </select>
        <button
          title="Delete item preset and all its markers"
          onClick={() =>
            confirm(
              markerCount > 0
                ? `Delete "${preset.name}" and remove all ${markerCount} of its marker(s) from this project? This can't be undone from here.`
                : `Delete item preset "${preset.name}"?`,
            ) && deleteItemPresetAndMarkers(preset.id)
          }
          className="shrink-0 text-[#8b93a3] hover:text-[#c0392b]"
        >
          ×
        </button>
      </div>

      {colorPickerOpen && (
        <div className="absolute left-7 top-8 z-10 flex flex-wrap gap-1 rounded border border-[#2a2d35] bg-[#1c1f27] p-1.5 shadow-lg">
          {LAYER_PALETTE.map((c) => (
            <button
              key={c}
              className="h-4 w-4 rounded-full ring-1 ring-black/30"
              style={{ backgroundColor: c }}
              onClick={() => {
                updateItemPreset(preset.id, { color: c })
                setColorPickerOpen(false)
              }}
            />
          ))}
        </div>
      )}

      <div className="mt-1.5 flex items-center gap-2 text-[10px] text-[#8b93a3]">
        <label className="flex items-center gap-1">
          Height (m):
          <input
            type="number"
            min="0"
            step="any"
            defaultValue={preset.defaultHeightM ?? ''}
            placeholder="—"
            onBlur={(e) => {
              const v = Number.parseFloat(e.target.value)
              updateItemPreset(preset.id, { defaultHeightM: Number.isFinite(v) && v >= 0 ? v : undefined })
            }}
            className="w-14 rounded bg-[#14161b] px-1 py-0.5 text-[#e4e7ec] outline-none ring-1 ring-[#333742]"
          />
        </label>
        <label className="flex items-center gap-1">
          Waste %:
          <input
            type="number"
            min="0"
            step="any"
            defaultValue={preset.defaultWastePercent ?? ''}
            placeholder="0"
            onBlur={(e) => {
              const v = Number.parseFloat(e.target.value)
              updateItemPreset(preset.id, { defaultWastePercent: Number.isFinite(v) && v > 0 ? v : undefined })
            }}
            className="w-12 rounded bg-[#14161b] px-1 py-0.5 text-[#e4e7ec] outline-none ring-1 ring-[#333742]"
          />
        </label>
        <label className="flex min-w-0 flex-1 items-center gap-1">
          Cost code:
          <input
            type="text"
            defaultValue={preset.costCode ?? ''}
            placeholder="e.g. ELEC-01"
            onBlur={(e) => updateItemPreset(preset.id, { costCode: e.target.value.trim() || undefined })}
            className="min-w-0 flex-1 rounded bg-[#14161b] px-1 py-0.5 text-[#e4e7ec] outline-none ring-1 ring-[#333742]"
          />
        </label>
      </div>
    </div>
  )
}

export function ItemPresetsDialog() {
  const open = useProjectStore((s) => s.itemPresetsDialogOpen)
  const close = useProjectStore((s) => s.closeItemPresetsDialog)
  const itemPresets = useProjectStore((s) => s.itemPresets)
  const addItemPreset = useProjectStore((s) => s.addItemPreset)
  const setActiveItemPresetId = useProjectStore((s) => s.setActiveItemPresetId)

  if (!open) return null

  return (
    <div className="absolute inset-0 z-20 flex items-center justify-center bg-black/50" onClick={close}>
      <div
        className="max-h-[80vh] w-[420px] overflow-y-auto rounded-lg border border-[#2a2d35] bg-[#1c1f27] p-4 shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-1 flex items-center justify-between">
          <h2 className="text-sm font-semibold text-[#e4e7ec]">Item presets</h2>
          <button className="text-[#8b93a3] hover:text-[#d7dae0]" onClick={close}>
            ×
          </button>
        </div>
        <p className="mb-3 text-xs text-[#8b93a3]">
          Saved across every project. Pick one as the active item while the Count tool is selected and your clicks
          will group under it instead of making a new tally mark each time.
        </p>

        {itemPresets.length === 0 && (
          <p className="mb-3 text-[11px] text-[#5b6270]">No item presets yet — add one below.</p>
        )}
        {itemPresets.map((preset) => (
          <PresetRow key={preset.id} preset={preset} />
        ))}

        <button
          onClick={() => setActiveItemPresetId(addItemPreset())}
          className="w-full rounded border border-[#333742] py-1.5 text-xs text-[#c7cbd4] hover:border-[#5b8def]"
        >
          + Add item preset
        </button>

        <div className="mt-3 flex justify-end">
          <button
            className="rounded bg-[#5b8def] px-3 py-1.5 text-xs font-semibold text-[#0b1220] hover:bg-[#79a3f2]"
            onClick={close}
          >
            Done
          </button>
        </div>
      </div>
    </div>
  )
}
