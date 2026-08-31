export function EmptyProjectState() {
  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-2 text-[#5b6270]">
      <svg width="40" height="40" viewBox="0 0 24 24" fill="none">
        <path
          d="M3 3h18v18H3V3zm4 4v10m10-10v10M3 12h18"
          stroke="currentColor"
          strokeWidth="1.2"
        />
      </svg>
      <div className="text-sm">Upload a plan sheet to get started</div>
      <div className="text-xs">PDF or image — use the + in the Sheets panel</div>
    </div>
  )
}
