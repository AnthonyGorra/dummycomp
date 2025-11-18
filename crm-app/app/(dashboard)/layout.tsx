'use client'

import dynamic from 'next/dynamic'
import { useTheme } from '@/contexts/theme-context'
import { useState } from 'react'

// Lazy load the Sidebar component for better initial page load
const Sidebar = dynamic(() => import('@/components/dashboard/sidebar'), {
  ssr: true,
  loading: () => <div className="w-64 h-screen bg-cream-dark animate-pulse" />
})

// Lazy load the Performance Monitor
const PerformanceMonitor = dynamic(
  () => import('@/components/performance/performance-monitor').then(mod => ({ default: mod.PerformanceMonitor })),
  { ssr: false }
)

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const { compactMode } = useTheme()

  return (
    <div className="min-h-screen bg-cream dark:bg-gray-900">
      <Sidebar />
      <main className={`flex-1 transition-all duration-200 ease-in-out ${compactMode ? 'md:pl-16' : 'md:pl-64'}`}>
        <div className="p-4 md:p-8">
          {children}
        </div>
      </main>
      {/* Performance Monitor - only in development or when enabled */}
      {process.env.NODE_ENV === 'development' && <PerformanceMonitor position="bottom-right" />}
    </div>
  )
}