import Panel from '@/components/Panel'
import { MOCK_EMAILS } from '@/lib/mockData'

export default function GmailPanel() {
  const unreadCount = MOCK_EMAILS.length

  return (
    <Panel
      id="05"
      title="Gmail · Inbox"
      gridArea="gmail"
      right={<span className="text-job-urgent">{unreadCount} unread</span>}
    >
      <div className="h-full flex flex-col divide-y divide-cream-200 overflow-y-auto">
        {MOCK_EMAILS.map((email) => (
          <div
            key={email.id}
            className="flex gap-3 px-4 py-3 hover:bg-cream-100 transition-colors cursor-pointer"
          >
            {/* Avatar */}
            <div className="w-8 h-8 rounded-full bg-charcoal-700 flex items-center justify-center shrink-0 mt-0.5">
              <span className="font-mono text-[9px] font-bold text-white">{email.senderInitials}</span>
            </div>

            {/* Content */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between gap-2 mb-0.5">
                <span className="font-sans text-xs font-semibold text-charcoal-900 truncate">{email.sender}</span>
                <div className="flex items-center gap-1.5 shrink-0">
                  {email.urgent && (
                    <span className="font-mono text-[8px] tracking-widest uppercase bg-job-urgent-bg text-job-urgent px-1.5 py-0.5 rounded-sm">
                      Urgent
                    </span>
                  )}
                  <span className="font-mono text-[9px] text-stone-400">{email.time}</span>
                </div>
              </div>
              <div className="font-sans text-xs font-medium text-charcoal-800 truncate mb-0.5">{email.subject}</div>
              <div className="font-sans text-[10px] text-stone-500 truncate leading-relaxed">{email.snippet}</div>
            </div>
          </div>
        ))}

        {/* Footer */}
        <div className="mt-auto px-4 py-3 bg-cream-100 border-t border-cream-300 shrink-0">
          <span className="panel-label">Connected · syncing every 5 min</span>
        </div>
      </div>
    </Panel>
  )
}
