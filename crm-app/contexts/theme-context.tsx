'use client'

import React, { createContext, useContext, useEffect, useState } from 'react'

type Theme = 'light' | 'dark'

interface ThemeContextType {
  theme: Theme
  setTheme: (theme: Theme) => void
  toggleTheme: () => void
  compactMode: boolean
  setCompactMode: (compact: boolean) => void
  toggleCompactMode: () => void
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined)

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setTheme] = useState<Theme>('light')
  const [compactMode, setCompactMode] = useState<boolean>(false)

  useEffect(() => {
    // Load theme from localStorage on mount
    const savedTheme = localStorage.getItem('link-crm-theme') as Theme
    if (savedTheme) {
      setTheme(savedTheme)
    } else {
      // Check system preference
      const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches
      setTheme(prefersDark ? 'dark' : 'light')
    }

    // Load compact mode from localStorage
    const savedCompactMode = localStorage.getItem('link-crm-compact-mode')
    if (savedCompactMode) {
      setCompactMode(savedCompactMode === 'true')
    }
  }, [])

  useEffect(() => {
    // Apply theme to document
    const root = document.documentElement
    
    if (theme === 'dark') {
      root.classList.add('dark')
    } else {
      root.classList.remove('dark')
    }

    // Save to localStorage
    localStorage.setItem('link-crm-theme', theme)
  }, [theme])

  useEffect(() => {
    // Save compact mode to localStorage
    localStorage.setItem('link-crm-compact-mode', compactMode.toString())
  }, [compactMode])

  const toggleTheme = () => {
    setTheme(prev => prev === 'light' ? 'dark' : 'light')
  }

  const toggleCompactMode = () => {
    setCompactMode(prev => !prev)
  }

  return (
    <ThemeContext.Provider value={{ theme, setTheme, toggleTheme, compactMode, setCompactMode, toggleCompactMode }}>
      {children}
    </ThemeContext.Provider>
  )
}

export function useTheme() {
  const context = useContext(ThemeContext)
  if (context === undefined) {
    throw new Error('useTheme must be used within a ThemeProvider')
  }
  return context
}