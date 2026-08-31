import { useEffect } from 'react'
import { Dashboard } from './components/Dashboard'
import { TakeoffScreen } from './components/TakeoffScreen'
import { initAutosave } from './store/persist'
import { useProjectStore } from './store/useProjectStore'

export default function App() {
  const screen = useProjectStore((s) => s.screen)
  const project = useProjectStore((s) => s.project)

  useEffect(() => {
    const unsubscribe = initAutosave()
    return unsubscribe
  }, [])

  useEffect(() => {
    function isTyping(e: KeyboardEvent) {
      const target = e.target as HTMLElement
      return target.tagName === 'INPUT' || target.tagName === 'TEXTAREA'
    }

    function onKeyDown(e: KeyboardEvent) {
      if (isTyping(e)) return
      const store = useProjectStore.getState()
      if (store.screen !== 'takeoff') return

      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'z') {
        e.preventDefault()
        if (e.shiftKey) store.redo()
        else store.undo()
        return
      }
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'y') {
        e.preventDefault()
        store.redo()
        return
      }
      if (e.metaKey || e.ctrlKey || e.altKey) return

      if (e.code === 'Space') {
        e.preventDefault()
        store.setSpaceHeld(true)
        return
      }

      switch (e.key) {
        case 'Escape':
          store.cancelDraft()
          store.clearPendingCalibration()
          break
        case 'Enter':
          store.commitDraft()
          break
        case 'Backspace':
        case 'Delete':
          if (store.draft.points.length > 0) store.removeLastDraftPoint()
          else if (store.selectedMeasurementId) store.deleteMeasurement(store.selectedMeasurementId)
          break
        case 'v':
        case 'V':
          store.setActiveTool('select')
          break
        case 'a':
        case 'A':
          store.setActiveTool('area')
          break
        case 'l':
        case 'L':
          store.setActiveTool('length')
          break
        case 'c':
        case 'C':
          store.setActiveTool('count')
          break
        case 'r':
        case 'R':
          store.setActiveTool('radius')
          break
        case 'k':
        case 'K':
          store.setActiveTool('calibrate')
          break
      }
    }

    function onKeyUp(e: KeyboardEvent) {
      if (e.code === 'Space') useProjectStore.getState().setSpaceHeld(false)
    }

    window.addEventListener('keydown', onKeyDown)
    window.addEventListener('keyup', onKeyUp)
    return () => {
      window.removeEventListener('keydown', onKeyDown)
      window.removeEventListener('keyup', onKeyUp)
    }
  }, [])

  if (screen === 'takeoff' && project) {
    return <TakeoffScreen project={project} />
  }

  return <Dashboard />
}
