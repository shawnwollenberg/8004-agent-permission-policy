'use client'

import { useAuth } from '@/hooks/useAuth'
import { useRouter } from 'next/navigation'
import { useEffect } from 'react'
import Link from 'next/link'
import { ConnectButton } from '@rainbow-me/rainbowkit'
import { cn } from '@/lib/utils'
import { usePathname } from 'next/navigation'
import {
  Shield,
  LayoutDashboard,
  FileCheck,
  Bot,
  Key,
  Activity,
  Settings,
  BookOpen,
  ExternalLink,
} from 'lucide-react'

const navItems = [
  { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/policies', label: 'Policies', icon: FileCheck },
  { href: '/agents', label: 'Agents', icon: Bot },
  { href: '/permissions', label: 'Permissions', icon: Key },
  { href: '/audit', label: 'Audit Log', icon: Activity },
  { href: '/settings', label: 'Settings', icon: Settings },
]

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const { isConnected, isAuthenticated, isInitialized } = useAuth()
  const router = useRouter()
  const pathname = usePathname()

  useEffect(() => {
    // Wait for auth state to be initialized before redirecting
    if (isInitialized && (!isConnected || !isAuthenticated)) {
      router.push('/')
    }
  }, [isConnected, isAuthenticated, isInitialized, router])

  // Show nothing while initializing to prevent flash
  if (!isInitialized) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    )
  }

  if (!isConnected || !isAuthenticated) {
    return null
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Sidebar */}
      <aside className="fixed left-0 top-0 z-40 h-screen w-64 border-r bg-card">
        <div className="flex h-full flex-col">
          <div className="flex h-16 items-center gap-2 border-b px-6">
            <Shield className="h-6 w-6 text-primary" />
            <span className="font-bold">Guardrail</span>
          </div>
          <nav className="flex-1 space-y-1 p-4">
            {navItems.map((item) => {
              const Icon = item.icon
              const isActive = pathname === item.href
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={cn(
                    'flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors',
                    isActive
                      ? 'bg-primary text-primary-foreground'
                      : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                  )}
                >
                  <Icon className="h-4 w-4" />
                  {item.label}
                </Link>
              )
            })}
          </nav>
          <div className="border-t p-4 space-y-1">
            <Link
              href="/docs"
              className="flex items-center gap-3 rounded-lg px-3 py-2 text-sm text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
            >
              <BookOpen className="h-4 w-4" />
              Documentation
            </Link>
            <a
              href="https://eips.ethereum.org/EIPS/eip-8004"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-3 rounded-lg px-3 py-2 text-sm text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
            >
              <ExternalLink className="h-4 w-4" />
              ERC-8004 Spec
            </a>
          </div>
        </div>
      </aside>

      {/* Main content */}
      <div className="ml-64">
        <header className="sticky top-0 z-30 flex h-16 items-center justify-between border-b bg-background/95 px-6 backdrop-blur">
          <h1 className="text-lg font-semibold">
            {navItems.find((item) => item.href === pathname)?.label || 'Dashboard'}
          </h1>
          <ConnectButton />
        </header>
        <main className="p-6">{children}</main>
      </div>
    </div>
  )
}
