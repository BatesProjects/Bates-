import { saveProject } from '../lib/db'
import { useProjectStore } from './useProjectStore'

/**
 * Call once at app startup. Saves to IndexedDB immediately whenever the
 * project changes.
 *
 * This used to debounce saves by 600ms, but every store action that touches
 * `project` is already a single discrete user action (draft/cursor/view
 * state live outside `project` and don't trigger this), so there was never
 * a high-frequency write to protect against -- only a window in which a
 * closed tab or reload could lose the most recent edit. Browsers don't
 * reliably let async work (IndexedDB included) finish inside a
 * 'beforeunload' handler, so debouncing plus a last-ditch unload flush
 * wasn't actually safe. Saving on every change removes the risk window
 * almost entirely instead of just papering over it.
 */
export function initAutosave(): () => void {
  let lastProjectRef: unknown = null
  const unsubscribe = useProjectStore.subscribe((state) => {
    if (!state.project || state.project === lastProjectRef) return
    lastProjectRef = state.project
    saveProject(state.project).catch((err) => {
      console.error('Failed to autosave project', err)
    })
  })
  return unsubscribe
}
