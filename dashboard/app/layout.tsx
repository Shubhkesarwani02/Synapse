import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'Recallhub - Your Second Brain',
  description: 'Search your memories naturally with AI-powered semantic search',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body className={inter.className}>
        <div className="min-h-screen bg-[var(--bg-soft)] text-[var(--text)] antialiased">
          <main className="app-container py-10">{children}</main>
        </div>
      </body>
    </html>
  )
}
