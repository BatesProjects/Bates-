import Panel from '@/components/Panel'
import { MOCK_XERO } from '@/lib/mockData'

interface TaskRowProps {
  count: number
  label: string
  sub: string
  urgent?: boolean
}

function TaskRow({ count, label, sub, urgent }: TaskRowProps) {
  return (
    <div className={`flex items-center gap-4 px-4 py-3 border-b border-cream-200 hover:bg-cream-100 transition-colors cursor-pointer group ${urgent ? 'border-l-2 border-l-job-urgent' : ''}`}>
      <span
        className={`font-sans text-2xl font-semibold tabular-nums w-10 shrink-0 ${
          urgent ? 'text-job-urgent' : 'text-charcoal-900'
        }`}
      >
        {count}
      </span>
      <div className="flex-1 min-w-0">
        <div className="font-sans text-sm font-medium text-charcoal-800">{label}</div>
        <div className="font-mono text-[9px] text-stone-500 uppercase tracking-wider mt-0.5">{sub}</div>
      </div>
      <span className="font-mono text-stone-400 text-sm group-hover:text-charcoal-700 transition-colors">→</span>
    </div>
  )
}

export default function XeroTasksPanel() {
  const x = MOCK_XERO

  return (
    <Panel id="07" title="Xero · Tasks" gridArea="xerotasks">
      <div className="h-full flex flex-col">
        <div className="flex-1 divide-y divide-cream-200 overflow-y-auto">
          <TaskRow
            count={x.toReconcile}
            label="Items to reconcile"
            sub="Ninety9 Constructions · NAB"
          />
          <TaskRow
            count={x.invoicesOverdueCount}
            label="Overdue invoices"
            sub="Action required"
            urgent
          />
          <TaskRow
            count={x.billsOverdueCount}
            label="Overdue bills"
            sub="Action required"
            urgent
          />
          <TaskRow
            count={x.billsCount - x.billsOverdueCount}
            label="Bills awaiting payment"
            sub="Upcoming"
          />
        </div>

        {/* Bank balance footer */}
        <div className="shrink-0 px-4 py-3 bg-cream-100 border-t border-cream-300">
          <div className="flex justify-between items-baseline">
            <span className="panel-label">Bank Balance</span>
            <span className="font-mono text-sm font-bold text-charcoal-900 tabular-nums">
              ${x.bankBalance.toLocaleString('en-AU', { minimumFractionDigits: 2 })}
            </span>
          </div>
          <div className="font-mono text-[8px] text-stone-400 mt-0.5">
            Ninety9 Constructions Pty Ltd · NAB
          </div>
        </div>
      </div>
    </Panel>
  )
}
