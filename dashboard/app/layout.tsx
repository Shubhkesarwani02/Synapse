import type { Metadata } from 'next'
import React from 'react'
import { Inter } from 'next/font/google'
import './globals.css'

// Simple theme initialization script: reads localStorage and applies data-theme
function ThemeScript(): JSX.Element {
  const code = `(() => {\n  try {\n    const stored = localStorage.getItem('rh-theme');\n    const prefersDark = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;\n    const theme = stored || (prefersDark ? 'dark' : 'light');\n    document.documentElement.dataset.theme = theme;\n  } catch(e) {\n    document.documentElement.dataset.theme = 'light';\n  }\n})();`;
  return <script dangerouslySetInnerHTML={{ __html: code }} />;
}

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
    <html lang="en" suppressHydrationWarning>
      <head />
      <body className={`${inter.className} antialiased`}>        <ThemeScript />        {children}      </body>
    </html>
  )
}
