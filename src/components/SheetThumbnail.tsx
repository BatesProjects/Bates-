import { useState } from 'react'
import { useSheetImage } from '../canvas/useSheetImage'
import { formatScaleRatio } from '../lib/scales'
import type { Sheet } from '../lib/types'

export function SheetThumbnail({
  sheet,
  active,
  onClick,
  onDelete,
  onRename,
}: {
  sheet: Sheet
  active: boolean
  onClick: () => void
  onDelete: () => void
  onRename: (name: string) => void
}) {
  const image = useSheetImage(sheet.imageBlobKey)
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState('')

  return (
    <div
      onClick={onClick}
      className={`group relative cursor-pointer rounded border p-1 transition-colors ${
        active ? 'border-[#5b8def] bg-[#1c2836]' : 'border-[#2a2d35] bg-[#1a1c22] hover:border-[#3a3e4a]'
      }`}
    >
      <div className="flex aspect-[3/4] w-full items-center justify-center overflow-hidden rounded bg-[#0e0f13]">
        {image ? (
          <img src={image.src} alt={sheet.name} className="h-full w-full object-contain" />
        ) : (
          <div className="text-[10px] text-[#4a4f5c]">Loading…</div>
        )}
      </div>
      {editing ? (
        <input
          autoFocus
          className="mt-1 w-full rounded bg-[#14161b] px-1 text-[10px] text-[#e4e7ec] outline-none ring-1 ring-[#5b8def]"
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onClick={(e) => e.stopPropagation()}
          onBlur={() => {
            if (draft.trim()) onRename(draft.trim())
            setEditing(false)
          }}
          onKeyDown={(e) => {
            if (e.key === 'Enter') e.currentTarget.blur()
            if (e.key === 'Escape') setEditing(false)
          }}
        />
      ) : (
        <div
          className="mt-1 truncate text-[10px] leading-tight text-[#aab0bb]"
          title={`${sheet.name} (double-click to rename)`}
          onDoubleClick={(e) => {
            e.stopPropagation()
            setDraft(sheet.name)
            setEditing(true)
          }}
        >
          {sheet.name}
        </div>
      )}
      {sheet.calibration ? (
        <div
          title={
            sheet.calibration.scaleRatio
              ? `Calibrated at ${formatScaleRatio(sheet.calibration.scaleRatio)}`
              : 'Calibrated'
          }
          className="absolute left-1 top-1 rounded bg-[#163a22] px-1 text-[9px] font-medium text-[#5fcf80]"
        >
          {sheet.calibration.scaleRatio ? formatScaleRatio(sheet.calibration.scaleRatio) : 'cal'}
        </div>
      ) : (
        <div className="absolute left-1 top-1 rounded bg-[#3a2a10] px-1 text-[9px] font-medium text-[#e8a53d]">
          uncal
        </div>
      )}
      <button
        onClick={(e) => {
          e.stopPropagation()
          onDelete()
        }}
        className="absolute right-1 top-1 hidden h-4 w-4 items-center justify-center rounded bg-[#2a2d35] text-[10px] text-[#c7cbd4] hover:bg-[#c0392b] group-hover:flex"
        title="Remove sheet"
      >
        ×
      </button>
    </div>
  )
}
