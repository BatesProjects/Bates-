import { deleteItemPresetRecord, putItemPreset, saveProject } from '../lib/db'
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

/**
 * Item presets are saved across all projects (IndexedDB "itemPresets"
 * store), not inside any one project's JSON. Mirrors initAutosave's
 * "write immediately on change" approach; the list is always small, so
 * re-writing every preset on each change (and deleting any that were
 * removed) is cheap.
 */
export function initItemPresetsAutosave(): () => void {
  let lastItemPresetsRef: unknown = null
  let lastIds = new Set<string>()
  const unsubscribe = useProjectStore.subscribe((state) => {
    if (state.itemPresets === lastItemPresetsRef) return
    lastItemPresetsRef = state.itemPresets
    const ids = new Set(state.itemPresets.map((p) => p.id))
    for (const id of lastIds) {
      if (!ids.has(id)) {
        deleteItemPresetRecord(id).catch((err) => console.error('Failed to delete item preset', err))
      }
    }
    for (const preset of state.itemPresets) {
      putItemPreset(preset).catch((err) => console.error('Failed to save item preset', err))
    }
    lastIds = ids
  })
  return unsubscribe
}
