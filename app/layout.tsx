import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'RSS Feed Analyzer',
  description: 'Analyze and validate RSS feeds with ease',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  )
}

