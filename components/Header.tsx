'use client'

import { useEffect, useState } from 'react'

export default function Header() {
  const [time, setTime] = useState('')
  const [date, setDate] = useState('')

  useEffect(() => {
    const update = () => {
      const now = new Date()
      setTime(
        now.toLocaleTimeString('en-AU', {
          hour: '2-digit',
          minute: '2-digit',
          second: '2-digit',
          hour12: false,
        })
      )
      setDate(
        now.toLocaleDateString('en-AU', {
          weekday: 'long',
          day: 'numeric',
          month: 'long',
          year: 'numeric',
        }).toUpperCase()
      )
    }
    update()
    const id = setInterval(update, 1000)
    return () => clearInterval(id)
  }, [])

  return (
    <header className="shrink-0 h-14 bg-charcoal-800 flex items-center justify-between px-6 rounded-sm">
      {/* Logo */}
      <div className="flex items-baseline gap-3">
        <span className="font-sans text-xl font-bold text-white tracking-tight leading-none">
          BATES
        </span>
        <span className="font-sans text-[10px] font-light text-white/50 tracking-[0.25em] uppercase">
          Projects
        </span>
      </div>

      {/* Centre tag */}
      <div className="font-mono text-[10px] text-white/30 tracking-[0.2em] uppercase">
        Bates OS · V1.0 · Command Centre
      </div>

      {/* Clock + date */}
      <div className="flex items-baseline gap-4">
        <span className="font-mono text-white/40 text-[10px] tracking-widest">{date}</span>
        <span className="font-mono text-white text-lg tracking-widest tabular-nums">{time}</span>
      </div>
    </header>
  )
}
