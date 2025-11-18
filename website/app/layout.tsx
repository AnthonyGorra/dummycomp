import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'Sterling Wealth Management - Building Wealth, Preserving Legacy',
  description: 'Trusted advisors to Australia\'s most successful families since 1978. Comprehensive wealth management solutions tailored to your unique circumstances.',
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