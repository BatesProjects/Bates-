import { saveProject } from '../lib/db'
import { useProjectStore } from './useProjectStore'

const AUTOSAVE_DEBOUNCE_MS = 600

let saveTimer: ReturnType<typeof setTimeout> | null = null

/** Call once at app startup. Debounces writes to IndexedDB whenever the project changes. */
export function initAutosave(): () => void {
  let lastProjectRef: unknown = null
  const unsubscribe = useProjectStore.subscribe((state) => {
    if (!state.project || state.project === lastProjectRef) return
    lastProjectRef = state.project
    const project = state.project
    if (saveTimer) clearTimeout(saveTimer)
    saveTimer = setTimeout(() => {
      saveProject(project).catch((err) => {
        console.error('Failed to autosave project', err)
      })
    }, AUTOSAVE_DEBOUNCE_MS)
  })
  return unsubscribe
}
