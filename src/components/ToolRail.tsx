import type { ToolId } from '../store/useProjectStore'
import { useProjectStore } from '../store/useProjectStore'

interface ToolDef {
  id: ToolId
  label: string
  shortcut: string
  icon: React.ReactNode
}

function Icon({ d }: { d: string }) {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
      <path d={d} stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

const TOOLS: ToolDef[] = [
  { id: 'select', label: 'Select / Edit', shortcut: 'V', icon: <Icon d="M4 3l7 17 2-7 7-2L4 3z" /> },
  { id: 'pan', label: 'Pan', shortcut: 'Space', icon: <Icon d="M12 2v11m0 0l-3-3m3 3l3-3M6 13v3a6 6 0 0012 0v-3" /> },
  { id: 'calibrate', label: 'Calibrate scale', shortcut: 'K', icon: <Icon d="M3 12h18M3 12l3-3M3 12l3 3M21 12l-3-3m3 3l-3 3" /> },
  { id: 'area', label: 'Area', shortcut: 'A', icon: <Icon d="M4 4h16v16H4z" /> },
  { id: 'length', label: 'Length', shortcut: 'L', icon: <Icon d="M3 21L21 3M6 18l3 3M15 6l3-3" /> },
  { id: 'count', label: 'Count', shortcut: 'C', icon: <Icon d="M12 2a5 5 0 100 10 5 5 0 000-10zM4 22c0-4 4-6 8-6s8 2 8 6" /> },
  { id: 'radius', label: 'Radius / Circle', shortcut: 'R', icon: <Icon d="M12 12m-8 0a8 8 0 1016 0 8 8 0 10-16 0M12 12h8" /> },
]

export function ToolRail() {
  const activeTool = useProjectStore((s) => s.activeTool)
  const setActiveTool = useProjectStore((s) => s.setActiveTool)
  const undo = useProjectStore((s) => s.undo)
  const redo = useProjectStore((s) => s.redo)
  const past = useProjectStore((s) => s.past)
  const future = useProjectStore((s) => s.future)

  return (
    <div className="flex w-12 shrink-0 flex-col items-center gap-1 border-r border-[#2a2d35] bg-[#191b21] py-2">
      {TOOLS.map((tool) => (
        <button
          key={tool.id}
          title={`${tool.label} (${tool.shortcut})`}
          onClick={() => setActiveTool(tool.id)}
          className={`flex h-9 w-9 items-center justify-center rounded transition-colors ${
            activeTool === tool.id
              ? 'bg-[#5b8def] text-[#0b1220]'
              : 'text-[#8b93a3] hover:bg-[#20232b] hover:text-[#d7dae0]'
          }`}
        >
          {tool.icon}
        </button>
      ))}

      <div className="my-2 h-px w-6 bg-[#2a2d35]" />

      <button
        title="Undo (Ctrl+Z)"
        disabled={past.length === 0}
        onClick={undo}
        className="flex h-9 w-9 items-center justify-center rounded text-[#8b93a3] hover:bg-[#20232b] hover:text-[#d7dae0] disabled:opacity-30 disabled:hover:bg-transparent"
      >
        <Icon d="M9 7L4 12l5 5M4 12h11a5 5 0 010 10h-1" />
      </button>
      <button
        title="Redo (Ctrl+Shift+Z)"
        disabled={future.length === 0}
        onClick={redo}
        className="flex h-9 w-9 items-center justify-center rounded text-[#8b93a3] hover:bg-[#20232b] hover:text-[#d7dae0] disabled:opacity-30 disabled:hover:bg-transparent"
      >
        <Icon d="M15 7l5 5-5 5M20 12H9a5 5 0 000 10h1" />
      </button>
    </div>
  )
}
