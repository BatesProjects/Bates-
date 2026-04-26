import { ReactNode } from 'react'

interface PanelProps {
  id: string
  title: string
  children: ReactNode
  gridArea: string
  right?: ReactNode
  className?: string
}

export default function Panel({ id, title, children, gridArea, right, className = '' }: PanelProps) {
  return (
    <div
      className={`bg-cream-50 border border-cream-300 rounded-sm flex flex-col overflow-hidden ${className}`}
      style={{ gridArea }}
    >
      {/* Panel header bar */}
      <div className="shrink-0 flex items-center justify-between px-4 py-2 border-b border-cream-300 bg-cream-100">
        <span className="panel-label">
          {id} <span className="text-cream-400 mx-1">//</span> {title}
        </span>
        {right && <div className="panel-label">{right}</div>}
      </div>

      {/* Content */}
      <div className="flex-1 overflow-hidden">
        {children}
      </div>
    </div>
  )
}
