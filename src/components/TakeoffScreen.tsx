import { CalibrationDialog } from './CalibrationDialog'
import { EmptyProjectState } from './EmptyProjectState'
import { RightPanel } from './RightPanel'
import { StatusBar } from './StatusBar'
import { ThumbnailSidebar } from './ThumbnailSidebar'
import { ToolRail } from './ToolRail'
import { TopBar } from './TopBar'
import { SheetCanvas } from '../canvas/SheetCanvas'
import type { Project } from '../lib/types'

export function TakeoffScreen({ project }: { project: Project }) {
  const activeSheet = project.sheets.find((s) => s.id === project.activeSheetId) ?? null

  return (
    <div className="flex h-screen w-screen flex-col bg-[#14161b] text-[#d7dae0]">
      <TopBar />
      <div className="flex min-h-0 flex-1">
        <ToolRail />
        <ThumbnailSidebar />
        <div className="relative flex min-w-0 flex-1 flex-col">
          {activeSheet ? <SheetCanvas sheet={activeSheet} /> : <EmptyProjectState />}
          <CalibrationDialog />
        </div>
        <RightPanel />
      </div>
      <StatusBar />
    </div>
  )
}
