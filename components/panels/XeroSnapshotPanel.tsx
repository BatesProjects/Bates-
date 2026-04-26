import Panel from '@/components/Panel'
import { MOCK_XERO } from '@/lib/mockData'

function formatCurrency(n: number, compact = false) {
  if (compact && n >= 1000000) return `$${(n / 1000000).toFixed(2)}M`
  if (compact && n >= 1000) return `$${(n / 1000).toFixed(0)}K`
  return new Intl.NumberFormat('en-AU', { style: 'currency', currency: 'AUD', maximumFractionDigits: 0 }).format(n)
}

function ChangeIndicator({ current, previous }: { current: number; previous: number }) {
  const pct = (((current - previous) / previous) * 100).toFixed(1)
  const up = current >= previous
  return (
    <span className={`font-mono text-[9px] ${up ? 'text-job-active' : 'text-job-urgent'}`}>
      {up ? '▲' : '▼'} {Math.abs(Number(pct))}% vs prior
    </span>
  )
}

function StatCard({ label, value, sub }: { label: string; value: string; sub?: React.ReactNode }) {
  return (
    <div className="bg-cream-100 border border-cream-300 rounded-sm p-3 flex flex-col gap-1">
      <span className="stat-label">{label}</span>
      <span className="stat-value">{value}</span>
      {sub && <div>{sub}</div>}
    </div>
  )
}

export default function XeroSnapshotPanel() {
  const x = MOCK_XERO
  return (
    <Panel id="03" title="Xero · Financials" gridArea="xerosnap" right={<span className="text-charcoal-700">LIVE</span>}>
      <div className="h-full grid grid-cols-2 gap-2 p-3">
        <StatCard
          label="Revenue YTD"
          value={formatCurrency(x.revenueYTD, true)}
          sub={<ChangeIndicator current={x.revenueYTD} previous={x.revenueLastYear} />}
        />
        <StatCard
          label="P&L This Quarter"
          value={formatCurrency(x.profitLossQTD, true)}
          sub={<ChangeIndicator current={x.profitLossQTD} previous={x.profitLossLastQTD} />}
        />
        <StatCard
          label="Invoices Owed"
          value={formatCurrency(x.invoicesOwed, true)}
          sub={
            <span className="font-mono text-[9px] text-stone-500">
              {x.invoicesCount} invoices · <span className="text-job-urgent">{x.invoicesOverdueCount} overdue</span>
            </span>
          }
        />
        <StatCard
          label="Bills to Pay"
          value={formatCurrency(x.billsToPay, true)}
          sub={
            <span className="font-mono text-[9px] text-stone-500">
              {x.billsCount} bills · <span className="text-job-urgent">{x.billsOverdueCount} overdue</span>
            </span>
          }
        />
      </div>
    </Panel>
  )
}
