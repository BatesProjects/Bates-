import { useEffect, useState } from 'react'
import { ToolRail } from './components/ToolRail'
import { ThumbnailSidebar } from './components/ThumbnailSidebar'
import { RightPanel } from './components/RightPanel'
import { StatusBar } from './components/StatusBar'
import { SheetCanvas } from './canvas/SheetCanvas'
import { CalibrationDialog } from './components/CalibrationDialog'
import { EmptyProjectState } from './components/EmptyProjectState'
import { TopBar } from './components/TopBar'
import { loadActiveProject } from './lib/db'
import { createProject } from './lib/project'
import { initAutosave } from './store/persist'
import { useProjectStore } from './store/useProjectStore'

export default function App() {
  const project = useProjectStore((s) => s.project)
  const loadProject = useProjectStore((s) => s.loadProject)
  const [ready, setReady] = useState(false)

  useEffect(() => {
    let cancelled = false
    loadActiveProject().then((existing) => {
      if (cancelled) return
      loadProject(existing ?? createProject('Untitled Project'))
      setReady(true)
    })
    const unsubscribe = initAutosave()
    return () => {
      cancelled = true
      unsubscribe()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    function isTyping(e: KeyboardEvent) {
      const target = e.target as HTMLElement
      return target.tagName === 'INPUT' || target.tagName === 'TEXTAREA'
    }

    function onKeyDown(e: KeyboardEvent) {
      if (isTyping(e)) return
      const store = useProjectStore.getState()

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

  if (!ready || !project) {
    return (
      <div className="flex h-screen w-screen items-center justify-center bg-[#14161b] text-[#8b93a3]">
        Loading project…
      </div>
    )
  }

  const activeSheet = project.sheets.find((s) => s.id === project.activeSheetId) ?? null

  return (
    <div className="flex h-screen w-screen flex-col bg-[#14161b] text-[#d7dae0]">
      <TopBar />
      <div className="flex min-h-0 flex-1">
        <ToolRail />
        <ThumbnailSidebar />
        <div className="relative flex min-w-0 flex-1 flex-col">
          {activeSheet ? (
            <SheetCanvas sheet={activeSheet} />
          ) : (
            <EmptyProjectState />
          )}
          <CalibrationDialog />
        </div>
        <RightPanel />
      </div>
      <StatusBar />
    </div>
  )
}
