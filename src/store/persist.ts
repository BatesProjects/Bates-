import { saveProject } from '../lib/db'
import type { Project } from '../lib/types'
import { useProjectStore } from './useProjectStore'

const AUTOSAVE_DEBOUNCE_MS = 600

let saveTimer: ReturnType<typeof setTimeout> | null = null
let pendingProject: Project | null = null

function flushPending() {
  if (saveTimer) {
    clearTimeout(saveTimer)
    saveTimer = null
  }
  if (pendingProject) {
    const project = pendingProject
    pendingProject = null
    saveProject(project).catch((err) => {
      console.error('Failed to autosave project', err)
    })
  }
}

/** Call once at app startup. Debounces writes to IndexedDB whenever the project changes. */
export function initAutosave(): () => void {
  let lastProjectRef: unknown = null
  const unsubscribe = useProjectStore.subscribe((state) => {
    if (!state.project || state.project === lastProjectRef) return
    lastProjectRef = state.project

    // If the user switches to a *different* project (dashboard nav) while an
    // edit to the previous one is still debouncing, flush it immediately
    // instead of silently dropping it when the timer below is cleared.
    if (pendingProject && pendingProject.id !== state.project.id) {
      flushPending()
    }

    pendingProject = state.project
    if (saveTimer) clearTimeout(saveTimer)
    saveTimer = setTimeout(flushPending, AUTOSAVE_DEBOUNCE_MS)
  })

  window.addEventListener('beforeunload', flushPending)
  return () => {
    unsubscribe()
    window.removeEventListener('beforeunload', flushPending)
  }
}
