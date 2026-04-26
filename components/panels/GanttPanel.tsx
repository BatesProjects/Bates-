import Panel from '@/components/Panel'
import { MOCK_JOBS, TODAY } from '@/lib/mockData'

const DAYS_SHOWN = 70

function getDayOffset(from: Date, target: Date) {
  return Math.floor((target.getTime() - from.getTime()) / (1000 * 60 * 60 * 24))
}

function formatShortDate(d: Date) {
  return d.toLocaleDateString('en-AU', { day: 'numeric', month: 'short' })
}

export default function GanttPanel() {
  // Start 7 days before today
  const viewStart = new Date(TODAY)
  viewStart.setDate(viewStart.getDate() - 7)

  const viewEnd = new Date(viewStart)
  viewEnd.setDate(viewStart.getDate() + DAYS_SHOWN)

  const todayOffset = getDayOffset(viewStart, TODAY)
  const todayPct = (todayOffset / DAYS_SHOWN) * 100

  // Month markers
  const monthMarkers: { label: string; pct: number }[] = []
  const cursor = new Date(viewStart)
  cursor.setDate(1)
  cursor.setMonth(cursor.getMonth() + 1)
  while (cursor < viewEnd) {
    const pct = (getDayOffset(viewStart, cursor) / DAYS_SHOWN) * 100
    monthMarkers.push({
      label: cursor.toLocaleDateString('en-AU', { month: 'short', year: '2-digit' }),
      pct,
    })
    cursor.setMonth(cursor.getMonth() + 1)
  }

  return (
    <Panel
      id="06"
      title="Scheduled Jobs · Timeline"
      gridArea="gantt"
      right={
        <span className="text-charcoal-700">
          {formatShortDate(viewStart)} — {formatShortDate(viewEnd)}
        </span>
      }
    >
      <div className="h-full flex flex-col px-4 py-3 gap-2">
        {/* Timeline axis */}
        <div className="relative h-4 shrink-0">
          <div className="absolute inset-x-0 bottom-0 h-px bg-cream-300" />
          {/* Today marker label */}
          <div
            className="absolute top-0 font-mono text-[8px] text-charcoal-700 -translate-x-1/2"
            style={{ left: `${todayPct}%` }}
          >
            Today
          </div>
          {/* Month labels */}
          {monthMarkers.map((m) => (
            <div
              key={m.label}
              className="absolute top-0 font-mono text-[8px] text-stone-400 -translate-x-1/2"
              style={{ left: `${m.pct}%` }}
            >
              {m.label}
            </div>
          ))}
        </div>

        {/* Job rows */}
        <div className="flex-1 flex flex-col gap-2 justify-around">
          {MOCK_JOBS.map((job) => {
            const start = new Date(job.startDate)
            const end = new Date(job.endDate)

            const startPct = Math.max(0, (getDayOffset(viewStart, start) / DAYS_SHOWN) * 100)
            const endPct = Math.min(100, (getDayOffset(viewStart, end) / DAYS_SHOWN) * 100)
            const widthPct = Math.max(endPct - startPct, 1)

            const isActive = job.status === 'active'

            return (
              <div key={job.id} className="flex items-center gap-3">
                {/* Label */}
                <div className="w-36 shrink-0 text-right">
                  <div className="font-sans text-[10px] font-medium text-charcoal-800 truncate">{job.name}</div>
                  <div className="font-mono text-[8px] text-stone-400 uppercase tracking-wider truncate">{job.client}</div>
                </div>

                {/* Bar track */}
                <div className="flex-1 relative h-6">
                  {/* Track */}
                  <div className="absolute inset-y-0 inset-x-0 rounded-sm bg-cream-200" />

                  {/* Today line */}
                  <div
                    className="absolute top-0 bottom-0 w-px bg-charcoal-700 z-10"
                    style={{ left: `${todayPct}%` }}
                  />

                  {/* Month lines */}
                  {monthMarkers.map((m) => (
                    <div
                      key={m.label}
                      className="absolute top-0 bottom-0 w-px bg-cream-300 z-0"
                      style={{ left: `${m.pct}%` }}
                    />
                  ))}

                  {/* Job bar */}
                  <div
                    className="absolute top-1 bottom-1 rounded-sm z-20 flex items-center px-2"
                    style={{
                      left: `${startPct}%`,
                      width: `${widthPct}%`,
                      backgroundColor: job.color,
                      opacity: isActive ? 1 : 0.6,
                    }}
                  >
                    <span className="font-mono text-[8px] text-white truncate">
                      {job.name.split(' ')[0]}
                    </span>
                  </div>
                </div>

                {/* Dates */}
                <div className="w-24 shrink-0">
                  <div className="font-mono text-[8px] text-stone-500">{formatShortDate(start)}</div>
                  <div className="font-mono text-[8px] text-stone-500">{formatShortDate(end)}</div>
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </Panel>
  )
}
