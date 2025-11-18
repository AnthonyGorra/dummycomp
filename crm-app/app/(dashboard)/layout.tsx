'use client'

import Sidebar from '@/components/dashboard/sidebar'
import { useTheme } from '@/contexts/theme-context'
import { useState } from 'react'

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
    </div>
  )
}