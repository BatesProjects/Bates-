import { useEffect, useRef, useState } from 'react'
import { deleteProjectAndBlobs, listProjects } from '../lib/db'
import { importProjectJson } from '../lib/exportImport'
import type { Project } from '../lib/types'
import { useProjectStore } from '../store/useProjectStore'
import { ProjectCard } from './ProjectCard'

function sortByRecent(projects: Project[]): Project[] {
  return [...projects].sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))
}

export function Dashboard() {
  const loadProject = useProjectStore((s) => s.loadProject)
  const newProject = useProjectStore((s) => s.newProject)
  const [projects, setProjects] = useState<Project[] | null>(null)
  const [creating, setCreating] = useState(false)
  const [nameDraft, setNameDraft] = useState('')
  const importInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    let cancelled = false
    listProjects().then((all) => {
      if (!cancelled) setProjects(sortByRecent(all))
    })
    return () => {
      cancelled = true
    }
  }, [])

  function handleCreate() {
    const name = nameDraft.trim()
    if (!name) return
    newProject(name)
  }

  async function handleDelete(project: Project) {
    if (!confirm(`Delete "${project.name}"? This removes its sheets and measurements permanently.`)) return
    await deleteProjectAndBlobs(project.id)
    setProjects((prev) => (prev ? prev.filter((p) => p.id !== project.id) : prev))
  }

  async function handleImport(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file) return
    try {
      const imported = await importProjectJson(file)
      loadProject(imported)
    } catch (err) {
      console.error(err)
      alert('Could not import that project file.')
    }
  }

  return (
    <div className="flex h-screen w-screen flex-col overflow-y-auto bg-[#14161b] text-[#d7dae0]">
      <div className="flex items-center gap-2 border-b border-[#2a2d35] bg-[#191b21] px-6 py-4">
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
          <path d="M3 3h18v18H3V3zm4 4v10m10-10v10M3 12h18" stroke="#5b8def" strokeWidth="1.6" />
        </svg>
        <span className="text-lg font-semibold tracking-wide text-[#e4e7ec]">Bates Takeoff</span>
        <span className="ml-2 text-xs text-[#6d7686]">Projects</span>
      </div>

      <div className="mx-auto w-full max-w-5xl flex-1 px-6 py-8">
        <div className="mb-6 flex items-center justify-between">
          <h1 className="text-xl font-semibold text-[#e4e7ec]">Your projects</h1>
          {!creating && (
            <div className="flex items-center gap-2">
              <button
                onClick={() => importInputRef.current?.click()}
                className="rounded px-3 py-2 text-xs font-medium text-[#c7cbd4] hover:bg-[#20232b]"
              >
                Import project…
              </button>
              <input ref={importInputRef} type="file" accept="application/json" hidden onChange={handleImport} />
              <button
                onClick={() => {
                  setCreating(true)
                  setNameDraft('')
                }}
                className="rounded bg-[#5b8def] px-4 py-2 text-sm font-semibold text-[#0b1220] hover:bg-[#79a3f2]"
              >
                + New Project
              </button>
            </div>
          )}
        </div>

        {creating && (
          <div className="mb-6 flex items-center gap-2 rounded-lg border border-[#2a2d35] bg-[#1c1f27] p-4">
            <input
              autoFocus
              placeholder="e.g. 114B Broadwater Esplanade — Deck & Bathroom"
              value={nameDraft}
              onChange={(e) => setNameDraft(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleCreate()
                if (e.key === 'Escape') setCreating(false)
              }}
              className="flex-1 rounded bg-[#14161b] px-3 py-2 text-sm text-[#e4e7ec] outline-none ring-1 ring-[#333742] focus:ring-[#5b8def]"
            />
            <button
              disabled={!nameDraft.trim()}
              onClick={handleCreate}
              className="rounded bg-[#5b8def] px-4 py-2 text-sm font-semibold text-[#0b1220] hover:bg-[#79a3f2] disabled:opacity-40"
            >
              Create
            </button>
            <button
              onClick={() => setCreating(false)}
              className="rounded px-3 py-2 text-sm text-[#8b93a3] hover:bg-[#20232b]"
            >
              Cancel
            </button>
          </div>
        )}

        {projects === null && <div className="text-sm text-[#6d7686]">Loading projects…</div>}

        {projects !== null && projects.length === 0 && !creating && (
          <div className="mt-16 flex flex-col items-center gap-2 text-center text-[#5b6270]">
            <svg width="40" height="40" viewBox="0 0 24 24" fill="none">
              <path d="M3 3h18v18H3V3zm4 4v10m10-10v10M3 12h18" stroke="currentColor" strokeWidth="1.2" />
            </svg>
            <div className="text-sm">No projects yet</div>
            <div className="text-xs">Click "+ New Project" to upload your first set of plans.</div>
          </div>
        )}

        {projects !== null && projects.length > 0 && (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {projects.map((project) => (
              <ProjectCard
                key={project.id}
                project={project}
                onOpen={() => loadProject(project)}
                onDelete={() => handleDelete(project)}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
