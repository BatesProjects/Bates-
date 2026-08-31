import { formatScaleReadout } from '../lib/coords'
import { useProjectStore } from '../store/useProjectStore'

export function StatusBar() {
  const project = useProjectStore((s) => s.project)
  const activeTool = useProjectStore((s) => s.activeTool)
  const hoverPoint = useProjectStore((s) => s.hoverPoint)
  const views = useProjectStore((s) => s.views)

  const activeSheet = project?.sheets.find((s) => s.id === project.activeSheetId) ?? null
  const view = activeSheet ? views[activeSheet.id] : undefined
  const zoomPct = view ? Math.round(view.scale * 100) : 100
  const ppm = activeSheet?.calibration?.pixelsPerMetre ?? 0

  return (
    <div className="flex h-6 shrink-0 items-center gap-4 border-t border-[#2a2d35] bg-[#191b21] px-3 text-[11px] text-[#8b93a3]">
      <span>
        Scale:{' '}
        <span className={ppm ? 'text-[#c7cbd4]' : 'text-[#e8a53d]'}>
          {activeSheet ? formatScaleReadout(ppm) : '—'}
        </span>
      </span>
      <span>Zoom: {zoomPct}%</span>
      <span>
        Cursor:{' '}
        {hoverPoint
          ? `${hoverPoint.x.toFixed(0)}, ${hoverPoint.y.toFixed(0)}px${
              ppm ? ` (${(hoverPoint.x / ppm).toFixed(2)}m, ${(hoverPoint.y / ppm).toFixed(2)}m)` : ''
            }`
          : '—'}
      </span>
      <span className="flex-1" />
      <span className="capitalize">Tool: {activeTool}</span>
    </div>
  )
}
