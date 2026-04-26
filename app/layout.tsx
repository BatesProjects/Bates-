import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'Bates Projects Dashboard',
  description: 'Command centre for Bates Projects',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  )
}
