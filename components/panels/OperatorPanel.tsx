import Panel from '@/components/Panel'

export default function OperatorPanel() {
  return (
    <Panel id="01" title="Operator" gridArea="operator">
      <div className="h-full flex flex-col justify-between p-4">
        {/* Identity */}
        <div>
          <div className="flex items-center gap-3 mb-4">
            <div className="w-12 h-12 rounded-full bg-charcoal-800 flex items-center justify-center shrink-0">
              <span className="font-sans text-sm font-bold text-white">WB</span>
            </div>
            <div>
              <div className="font-serif text-base font-medium text-charcoal-900 leading-tight">
                Wilson Bates
              </div>
              <div className="font-mono text-[9px] tracking-widest text-stone-500 uppercase mt-0.5">
                Director
              </div>
            </div>
          </div>

          {/* Company logo text */}
          <div className="bg-charcoal-800 rounded-sm px-3 py-2 mb-4">
            <div className="font-sans text-lg font-bold text-white tracking-tight leading-none">
              BATES
            </div>
            <div className="font-sans text-[8px] font-light text-white/50 tracking-[0.22em] uppercase">
              Projects Pty Ltd
            </div>
          </div>
        </div>

        {/* Status fields */}
        <div className="space-y-2">
          <div className="flex justify-between items-center">
            <span className="panel-label">Status</span>
            <div className="flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-job-active inline-block" />
              <span className="font-mono text-[9px] text-charcoal-700 tracking-wider uppercase">Online</span>
            </div>
          </div>
          <div className="flex justify-between items-center">
            <span className="panel-label">Focus</span>
            <span className="font-mono text-[9px] text-charcoal-700 tracking-wider uppercase">Deep Work</span>
          </div>
          <div className="flex justify-between items-center">
            <span className="panel-label">Location</span>
            <span className="font-mono text-[9px] text-charcoal-700 tracking-wider uppercase">Sydney, NSW</span>
          </div>
          <div className="flex justify-between items-center border-t border-cream-300 pt-2 mt-2">
            <span className="panel-label">Active Jobs</span>
            <span className="font-mono text-[9px] font-bold text-charcoal-900">3</span>
          </div>
          <div className="flex justify-between items-center">
            <span className="panel-label">Scheduled</span>
            <span className="font-mono text-[9px] font-bold text-charcoal-900">2</span>
          </div>
        </div>
      </div>
    </Panel>
  )
}
