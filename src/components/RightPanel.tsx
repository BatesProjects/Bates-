import { LayersPanel } from './LayersPanel'
import { MeasurementsPanel } from './MeasurementsPanel'

export function RightPanel() {
  return (
    <div className="flex w-72 shrink-0 flex-col border-l border-[#2a2d35] bg-[#16181e]">
      <LayersPanel />
      <MeasurementsPanel />
    </div>
  )
}
