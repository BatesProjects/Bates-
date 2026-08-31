import { useState } from 'react'
import { exportProjectJson } from '../lib/exportImport'
import { exportWorkbook } from '../lib/exportXlsx'
import { useProjectStore } from '../store/useProjectStore'

export function TopBar() {
  const project = useProjectStore((s) => s.project)
  const renameProject = useProjectStore((s) => s.renameProject)
  const goToDashboard = useProjectStore((s) => s.goToDashboard)
  const [editingName, setEditingName] = useState(false)
  const [nameDraft, setNameDraft] = useState('')

  if (!project) return null

  return (
    <div className="flex h-11 shrink-0 items-center gap-3 border-b border-[#2a2d35] bg-[#191b21] px-3">
      <button
        className="flex items-center gap-2 rounded px-1.5 py-1 text-[#5b8def] hover:bg-[#20232b]"
        onClick={goToDashboard}
        title="Back to all projects"
      >
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
          <path
            d="M3 3h18v18H3V3zm4 4v10m10-10v10M3 12h18"
            stroke="currentColor"
            strokeWidth="1.6"
          />
        </svg>
        <span className="font-semibold tracking-wide text-[#e4e7ec]">TAKEOFF</span>
      </button>

      <button
        className="flex items-center gap-1 rounded px-2 py-1 text-xs text-[#8b93a3] hover:bg-[#20232b] hover:text-[#d7dae0]"
        onClick={goToDashboard}
      >
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none">
          <path d="M15 18l-6-6 6-6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
        All projects
      </button>

      <div className="mx-2 h-5 w-px bg-[#2a2d35]" />

      {editingName ? (
        <input
          autoFocus
          className="rounded bg-[#20232b] px-2 py-1 text-sm text-[#e4e7ec] outline-none ring-1 ring-[#5b8def]"
          value={nameDraft}
          onChange={(e) => setNameDraft(e.target.value)}
          onBlur={() => {
            if (nameDraft.trim()) renameProject(nameDraft.trim())
            setEditingName(false)
          }}
          onKeyDown={(e) => {
            if (e.key === 'Enter') e.currentTarget.blur()
            if (e.key === 'Escape') setEditingName(false)
          }}
        />
      ) : (
        <button
          className="rounded px-2 py-1 text-sm text-[#c7cbd4] hover:bg-[#20232b]"
          onClick={() => {
            setNameDraft(project.name)
            setEditingName(true)
          }}
          title="Rename project"
        >
          {project.name}
        </button>
      )}

      <div className="flex-1" />

      <button
        className="rounded px-3 py-1.5 text-xs font-medium text-[#c7cbd4] hover:bg-[#20232b]"
        onClick={() => {
          exportProjectJson(project).catch((err) => {
            console.error(err)
            alert('Failed to export project JSON.')
          })
        }}
      >
        Export JSON
      </button>

      <button
        className="rounded bg-[#5b8def] px-3 py-1.5 text-xs font-semibold text-[#0b1220] hover:bg-[#79a3f2]"
        onClick={() => exportWorkbook(project)}
      >
        Export XLSX
      </button>
    </div>
  )
}
