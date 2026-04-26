import Panel from '@/components/Panel'
import { MOCK_JOBS, type JobStatus } from '@/lib/mockData'

const STATUS_STYLES: Record<JobStatus, { dot: string; badge: string; text: string }> = {
  active: {
    dot: 'bg-job-active',
    badge: 'bg-job-active-bg text-job-active',
    text: 'Active',
  },
  scheduled: {
    dot: 'bg-job-scheduled',
    badge: 'bg-job-scheduled-bg text-job-scheduled',
    text: 'Scheduled',
  },
  complete: {
    dot: 'bg-job-complete',
    badge: 'bg-job-complete-bg text-job-complete',
    text: 'Complete',
  },
}

function formatCurrency(n: number) {
  return new Intl.NumberFormat('en-AU', { style: 'currency', currency: 'AUD', maximumFractionDigits: 0 }).format(n)
}

export default function ActiveJobsPanel() {
  const activeJobs = MOCK_JOBS.filter((j) => j.status === 'active')
  const scheduledJobs = MOCK_JOBS.filter((j) => j.status === 'scheduled')
  const allJobs = [...activeJobs, ...scheduledJobs]
  const totalValue = activeJobs.reduce((sum, j) => sum + j.value, 0)

  return (
    <Panel
      id="02"
      title="Jobs"
      gridArea="activejobs"
      right={<span className="text-charcoal-700">{activeJobs.length} active · {scheduledJobs.length} scheduled</span>}
    >
      <div className="h-full flex flex-col">
        {/* Total active value */}
        <div className="px-4 py-3 border-b border-cream-300 flex items-baseline gap-3">
          <span className="font-sans text-2xl font-semibold text-charcoal-900 tabular-nums">
            {formatCurrency(totalValue)}
          </span>
          <span className="panel-label">active pipeline value</span>
        </div>

        {/* Job rows */}
        <div className="flex-1 overflow-y-auto divide-y divide-cream-200">
          {allJobs.map((job) => {
            const s = STATUS_STYLES[job.status]
            return (
              <div key={job.id} className="flex items-center gap-4 px-4 py-3 hover:bg-cream-100 transition-colors">
                {/* Status dot */}
                <span className={`w-2 h-2 rounded-full shrink-0 ${s.dot}`} />

                {/* Name + client */}
                <div className="flex-1 min-w-0">
                  <div className="font-sans text-sm font-medium text-charcoal-900 truncate">{job.name}</div>
                  <div className="font-mono text-[9px] text-stone-500 uppercase tracking-wider mt-0.5">{job.client}</div>
                </div>

                {/* Status badge */}
                <span className={`font-mono text-[8px] tracking-widest uppercase px-2 py-0.5 rounded-sm shrink-0 ${s.badge}`}>
                  {s.text}
                </span>

                {/* Value */}
                <span className="font-mono text-xs text-charcoal-700 tabular-nums shrink-0 w-24 text-right">
                  {formatCurrency(job.value)}
                </span>
              </div>
            )
          })}
        </div>
      </div>
    </Panel>
  )
}
