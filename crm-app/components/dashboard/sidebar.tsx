'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { cn } from '@/lib/utils'
import {
  LayoutDashboard,
  Users,
  Building2,
  Briefcase,
  Settings,
  LogOut,
  Menu,
  X,
  Bot,
  CheckSquare
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { createClient } from '@/lib/supabase'
import { useRouter } from 'next/navigation'
import { useState, useRef } from 'react'
import { useTheme } from '@/contexts/theme-context'

const navigation = [
  { name: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
  { name: 'Clients', href: '/clients', icon: Users },
  { name: 'Tasks', href: '/tasks', icon: CheckSquare },
  { name: 'AI Assistant', href: '/ai-assistant', icon: Bot },
]

export default function Sidebar() {
  const pathname = usePathname()
  const router = useRouter()
  const supabase = createClient()
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [isHovered, setIsHovered] = useState(false)
  const { compactMode } = useTheme()
  const hoverTimeoutRef = useRef<NodeJS.Timeout | null>(null)

  const isExpanded = !compactMode || isHovered
  
  const handleMouseEnter = () => {
    if (compactMode) {
      // Clear any existing timeout
      if (hoverTimeoutRef.current) {
        clearTimeout(hoverTimeoutRef.current)
      }
      // Add a small delay to prevent accidental expansion
      hoverTimeoutRef.current = setTimeout(() => {
        setIsHovered(true)
      }, 150)
    }
  }
  
  const handleMouseLeave = () => {
    if (compactMode) {
      // Clear timeout if user leaves before delay completes
      if (hoverTimeoutRef.current) {
        clearTimeout(hoverTimeoutRef.current)
      }
      setIsHovered(false)
    }
  }

  const handleLogout = async () => {
    await supabase.auth.signOut()
    router.push('/auth/login')
  }

  return (
    <>
      {/* Mobile menu button */}
      <Button
        variant="ghost"
        className="fixed top-4 left-4 z-50 md:hidden"
        onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
      >
        {mobileMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
      </Button>

      {/* Overlay for mobile */}
      {mobileMenuOpen && (
        <div
          className="fixed inset-0 z-30 bg-black/50 md:hidden"
          onClick={() => setMobileMenuOpen(false)}
        />
      )}

      {/* Sidebar */}
      <div 
        className={cn(
          "fixed inset-y-0 left-0 z-40 bg-white dark:bg-gray-900 border-r border-cream-dark dark:border-gray-700 transform transition-all duration-300 ease-in-out md:translate-x-0",
          isExpanded ? "w-64" : "w-16",
          mobileMenuOpen ? "translate-x-0" : "-translate-x-full md:translate-x-0",
          compactMode && isHovered && "shadow-lg"
        )}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
      >
        <div className="flex h-full flex-col">
          {/* Logo */}
          <div className={cn(
            "flex h-16 items-center border-b border-cream-dark dark:border-gray-700",
            isExpanded ? "px-6 justify-start" : "px-2 justify-center"
          )}>
            {!isExpanded ? (
              <div className="h-8 w-8 bg-coral rounded-lg flex items-center justify-center">
                <span className="text-white font-bold text-sm">L</span>
              </div>
            ) : (
              <div className="flex items-center gap-3">
                <div className="h-8 w-8 bg-coral rounded-lg flex items-center justify-center">
                  <span className="text-white font-bold text-sm">L</span>
                </div>
                <h2 className={cn(
                  "text-xl font-semibold text-black dark:text-white transition-opacity duration-200",
                  compactMode && !isHovered ? "opacity-0" : "opacity-100"
                )}>Link</h2>
              </div>
            )}
          </div>

          {/* Navigation */}
          <nav className={cn(
            "flex-1 space-y-1 py-4",
            isExpanded ? "px-3" : "px-2"
          )}>
            {navigation.map((item) => {
              const isActive = pathname.startsWith(item.href)
              return (
                <Link
                  key={item.name}
                  href={item.href}
                  onClick={() => setMobileMenuOpen(false)}
                  className={cn(
                    'group flex items-center text-sm font-medium rounded-lg transition-all duration-200',
                    isExpanded ? 'px-3 py-2' : 'justify-center p-3',
                    isActive
                      ? 'bg-coral text-white'
                      : 'text-gray-700 dark:text-gray-300 hover:bg-cream dark:hover:bg-gray-800 hover:text-black dark:hover:text-white'
                  )}
                  title={!isExpanded ? item.name : undefined}
                >
                  <item.icon
                    className={cn(
                      'h-5 w-5 flex-shrink-0 transition-all duration-200',
                      isExpanded ? 'mr-3' : '',
                      isActive ? 'text-white' : 'text-gray-500 dark:text-gray-400 group-hover:text-black dark:group-hover:text-white'
                    )}
                  />
                  <span className={cn(
                    "transition-all duration-200 overflow-hidden whitespace-nowrap",
                    isExpanded ? "opacity-100 max-w-none" : "opacity-0 max-w-0"
                  )}>
                    {item.name}
                  </span>
                </Link>
              )
            })}
          </nav>

          {/* Bottom section */}
          <div className={cn(
            "border-t border-cream-dark dark:border-gray-700",
            isExpanded ? "p-4" : "p-2"
          )}>
            <div className="space-y-1">
              <Link
                href="/settings"
                onClick={() => setMobileMenuOpen(false)}
                className={cn(
                  'group flex items-center text-sm font-medium rounded-lg transition-all duration-200',
                  isExpanded ? 'px-3 py-2' : 'justify-center p-3',
                  pathname.startsWith('/settings')
                    ? 'bg-coral text-white'
                    : 'text-gray-700 dark:text-gray-300 hover:bg-cream dark:hover:bg-gray-800 hover:text-black dark:hover:text-white'
                )}
                title={!isExpanded ? "User Settings" : undefined}
              >
                <Settings
                  className={cn(
                    'h-5 w-5 flex-shrink-0 transition-all duration-200',
                    isExpanded ? 'mr-3' : '',
                    pathname.startsWith('/settings') ? 'text-white' : 'text-gray-500 dark:text-gray-400 group-hover:text-black dark:group-hover:text-white'
                  )}
                />
                <span className={cn(
                  "transition-all duration-200 overflow-hidden whitespace-nowrap",
                  isExpanded ? "opacity-100 max-w-none" : "opacity-0 max-w-0"
                )}>
                  User Settings
                </span>
              </Link>
              
              <Button
                variant="ghost"
                className={cn(
                  "text-gray-700 dark:text-gray-300 hover:bg-cream dark:hover:bg-gray-800 hover:text-black dark:hover:text-white transition-all duration-200",
                  isExpanded ? "w-full justify-start" : "w-full justify-center p-3"
                )}
                onClick={handleLogout}
                title={!isExpanded ? "Logout" : undefined}
              >
                <LogOut className={cn(
                  "h-5 w-5 transition-all duration-200", 
                  isExpanded ? "mr-3" : ""
                )} />
                <span className={cn(
                  "transition-all duration-200 overflow-hidden whitespace-nowrap",
                  isExpanded ? "opacity-100 max-w-none" : "opacity-0 max-w-0"
                )}>
                  Logout
                </span>
              </Button>
            </div>
          </div>
        </div>
      </div>
    </>
  )
}