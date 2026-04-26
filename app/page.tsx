import Header from '@/components/Header'
import OperatorPanel from '@/components/panels/OperatorPanel'
import ActiveJobsPanel from '@/components/panels/ActiveJobsPanel'
import XeroSnapshotPanel from '@/components/panels/XeroSnapshotPanel'
import CalendarPanel from '@/components/panels/CalendarPanel'
import GmailPanel from '@/components/panels/GmailPanel'
import GanttPanel from '@/components/panels/GanttPanel'
import XeroTasksPanel from '@/components/panels/XeroTasksPanel'

export default function Dashboard() {
  return (
    <div className="h-screen w-screen bg-cream-200 flex flex-col p-3 gap-3 overflow-hidden font-sans">
      <Header />

      {/* Bento grid — 1920×1080 optimised */}
      <div
        className="flex-1 min-h-0 grid gap-3"
        style={{
          gridTemplateColumns: '260px 1fr 1fr',
          gridTemplateRows: '260px 1fr 230px',
          gridTemplateAreas: `
            "operator activejobs xerosnap"
            "calendar calendar    gmail"
            "gantt    gantt       xerotasks"
          `,
        }}
      >
        <OperatorPanel />
        <ActiveJobsPanel />
        <XeroSnapshotPanel />
        <CalendarPanel />
        <GmailPanel />
        <GanttPanel />
        <XeroTasksPanel />
      </div>
    </div>
  )
}
