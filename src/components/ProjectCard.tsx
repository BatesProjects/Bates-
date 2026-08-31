import { useSheetImage } from '../canvas/useSheetImage'
import { buildSummary } from '../lib/summary'
import type { Project } from '../lib/types'

function formatUpdated(iso: string): string {
  const date = new Date(iso)
  const now = new Date()
  const sameDay = date.toDateString() === now.toDateString()
  if (sameDay) {
    return `Today, ${date.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' })}`
  }
  return date.toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' })
}

export function ProjectCard({
  project,
  onOpen,
  onDelete,
}: {
  project: Project
  onOpen: () => void
  onDelete: () => void
}) {
  const firstSheet = [...project.sheets].sort((a, b) => a.order - b.order)[0]
  const thumbnail = useSheetImage(firstSheet?.imageBlobKey ?? null)
  const summary = buildSummary(project)
  const gt = summary.grandTotals

  const statParts: string[] = []
  if (gt.areaM2 > 0) statParts.push(`${gt.areaM2.toFixed(1)} m²`)
  if (gt.lengthM > 0) statParts.push(`${gt.lengthM.toFixed(1)} m`)
  if (gt.count > 0) statParts.push(`${gt.count} no.`)

  return (
    <div
      onClick={onOpen}
      className="group relative flex cursor-pointer flex-col overflow-hidden rounded-lg border border-[#2a2d35] bg-[#1a1c22] transition-colors hover:border-[#5b8def]"
    >
      <div className="flex aspect-[16/10] w-full items-center justify-center overflow-hidden bg-[#0e0f13]">
        {thumbnail ? (
          <img src={thumbnail.src} alt="" className="h-full w-full object-contain" />
        ) : (
          <svg width="28" height="28" viewBox="0 0 24 24" fill="none">
            <path d="M3 3h18v18H3V3zm4 4v10m10-10v10M3 12h18" stroke="#3a3e4a" strokeWidth="1.2" />
          </svg>
        )}
      </div>
      <div className="flex flex-1 flex-col gap-1 p-3">
        <div className="truncate text-sm font-medium text-[#e4e7ec]" title={project.name}>
          {project.name}
        </div>
        <div className="text-xs text-[#6d7686]">
          {project.sheets.length} sheet{project.sheets.length === 1 ? '' : 's'} · {project.measurements.length}{' '}
          measurement{project.measurements.length === 1 ? '' : 's'}
        </div>
        {statParts.length > 0 && <div className="text-xs text-[#8b93a3]">{statParts.join(' · ')}</div>}
        <div className="mt-auto pt-2 text-[10px] text-[#5b6270]">Updated {formatUpdated(project.updatedAt)}</div>
      </div>
      <button
        onClick={(e) => {
          e.stopPropagation()
          onDelete()
        }}
        title="Delete project"
        className="absolute right-2 top-2 hidden h-6 w-6 items-center justify-center rounded bg-[#1c1f27]/90 text-sm text-[#c7cbd4] hover:bg-[#c0392b] group-hover:flex"
      >
        ×
      </button>
    </div>
  )
}
