'use client'

import Panel from '@/components/Panel'
import { MOCK_JOBS, TODAY } from '@/lib/mockData'

const DAY_LABELS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']

function getFortnightDays(from: Date): Date[] {
  const days: Date[] = []
  // start from Monday of the current week
  const start = new Date(from)
  const dow = start.getDay() === 0 ? 6 : start.getDay() - 1
  start.setDate(start.getDate() - dow)
  for (let i = 0; i < 14; i++) {
    const d = new Date(start)
    d.setDate(start.getDate() + i)
    days.push(d)
  }
  return days
}

function isSameDay(a: Date, b: Date) {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate()
}

function jobCoversDay(job: { startDate: string; endDate: string }, day: Date) {
  const start = new Date(job.startDate)
  const end = new Date(job.endDate)
  return day >= start && day <= end
}

const JOB_COLORS: string[] = [
  'bg-[#4A7C59]/20 border-l-2 border-[#4A7C59]',
  'bg-[#6B8A4A]/20 border-l-2 border-[#6B8A4A]',
  'bg-[#4A6E7C]/20 border-l-2 border-[#4A6E7C]',
  'bg-[#4A6B8A]/20 border-l-2 border-[#4A6B8A]',
  'bg-[#6A4A8A]/20 border-l-2 border-[#6A4A8A]',
]

export default function CalendarPanel() {
  const days = getFortnightDays(TODAY)
  const today = TODAY

  return (
    <Panel
      id="04"
      title="Calendar"
      gridArea="calendar"
      right={<span className="text-charcoal-700">Fortnight View</span>}
    >
      <div className="h-full flex flex-col p-3 gap-2">
        {/* Two-week grid: 7 cols */}
        {[0, 1].map((week) => (
          <div key={week} className="flex-1 grid grid-cols-7 gap-1.5">
            {days.slice(week * 7, week * 7 + 7).map((day, i) => {
              const isToday = isSameDay(day, today)
              const isPast = day < today && !isToday
              const dayJobs = MOCK_JOBS.filter((j) => jobCoversDay(j, day))

              return (
                <div
                  key={i}
                  className={`rounded-sm border flex flex-col overflow-hidden ${
                    isToday
                      ? 'border-charcoal-700 bg-charcoal-800'
                      : isPast
                      ? 'border-cream-200 bg-cream-100/50'
                      : 'border-cream-300 bg-cream-50'
                  }`}
                >
                  {/* Day header */}
                  <div
                    className={`px-2 pt-1.5 pb-1 flex items-baseline justify-between ${
                      isToday ? 'border-b border-charcoal-700' : 'border-b border-cream-200'
                    }`}
                  >
                    <span
                      className={`font-mono text-[8px] tracking-wider uppercase ${
                        isToday ? 'text-white/50' : isPast ? 'text-stone-400' : 'text-stone-500'
                      }`}
                    >
                      {DAY_LABELS[(week * 7 + i) % 7]}
                    </span>
                    <span
                      className={`font-sans text-sm font-semibold ${
                        isToday ? 'text-white' : isPast ? 'text-stone-400' : 'text-charcoal-900'
                      }`}
                    >
                      {day.getDate()}
                    </span>
                  </div>

                  {/* Job chips */}
                  <div className="flex-1 px-1 py-1 space-y-0.5 overflow-hidden">
                    {dayJobs.slice(0, 3).map((job, ji) => (
                      <div
                        key={job.id}
                        className={`text-[7px] font-mono truncate px-1 py-px rounded-sm ${JOB_COLORS[ji % JOB_COLORS.length]}`}
                        style={{ color: job.color }}
                      >
                        {job.name.split(' ')[0]}
                      </div>
                    ))}
                    {dayJobs.length > 3 && (
                      <div className="font-mono text-[7px] text-stone-400 px-1">+{dayJobs.length - 3}</div>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        ))}

        {/* Legend */}
        <div className="shrink-0 flex gap-4 pt-1 border-t border-cream-300">
          {MOCK_JOBS.map((job) => (
            <div key={job.id} className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-sm shrink-0" style={{ backgroundColor: job.color }} />
              <span className="font-mono text-[8px] text-stone-500 truncate max-w-[80px]">{job.name}</span>
            </div>
          ))}
        </div>
      </div>
    </Panel>
  )
}
