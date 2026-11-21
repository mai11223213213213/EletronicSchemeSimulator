
import { useState } from 'react'
import {
  CircuitBoard,
  LogOut,
  Plus,
} from 'lucide-react'

import { useAuth } from '../auth/AuthContext'

export function PersonalPage() {
  const { user, logout } = useAuth()
  const [error, setError] = useState('')
  const [isLoggingOut, setIsLoggingOut] = useState(false)

  async function handleLogout() {
    setError('')
    setIsLoggingOut(true)

    try {
      await logout()
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : 'Unable to sign out. Please try again.',
      )
    } finally {
      setIsLoggingOut(false)
    }
  }

  const initials = user?.email?.slice(0, 1).toUpperCase() ?? 'U'

  return (
    <main className="min-h-screen bg-[#f1f3f2] text-[#26332d]">
      {/* Header */}
      <header className="sticky top-0 z-30 border-b border-[#dfe5e1] bg-white">
        <div className="mx-auto flex h-[68px] max-w-[1500px] items-center justify-between px-5 sm:px-8">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#176b4b] text-white">
              <CircuitBoard className="h-5 w-5" />
            </div>

            <p className="text-sm font-bold tracking-tight text-[#26332d]">
              Electronic Scheme Simulator
            </p>
          </div>

          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2.5 rounded-xl px-2 py-1.5">
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-[#e5eee8] text-xs font-bold text-[#176b4b]">
                {initials}
              </div>

              <span className="hidden max-w-[190px] truncate text-xs font-medium text-[#536159] sm:inline">
                {user?.email}
              </span>
            </div>

            <div className="h-7 w-px bg-[#e5e9e6]" />

            <button
              type="button"
              onClick={handleLogout}
              disabled={isLoggingOut}
              title="Sign out"
              className="inline-flex h-9 items-center gap-2 rounded-lg px-3 text-xs font-semibold text-[#65736a] transition hover:bg-[#f0f4f1] hover:text-[#176b4b] disabled:cursor-not-allowed disabled:opacity-50"
            >
              <LogOut className="h-4 w-4" />
              <span className="hidden md:inline">
                {isLoggingOut ? 'Signing out...' : 'Sign out'}
              </span>
            </button>
          </div>
        </div>
      </header>

      {/* Main content */}
      <section className="mx-auto max-w-[1500px] px-5 py-9 sm:px-8 sm:py-12">
        <div className="border-b border-[#dfe5e1] pb-7">
          <p className="mb-2 text-xs font-medium text-[#829087]">
            Personal workspace
          </p>

          <h1 className="text-3xl font-semibold tracking-tight text-[#26332d]">
            My circuits
          </h1>

          <p className="mt-2 text-sm text-[#7f8c83]">
            Your electronic circuit designs.
          </p>
        </div>

        {/* Projects */}
        <div className="mt-8">
          <div className="flex min-h-[340px] flex-col items-center justify-center rounded-2xl border border-dashed border-[#cbd7ce] bg-white px-6 py-12 text-center">
            <div className="relative flex h-24 w-24 items-center justify-center rounded-2xl border border-[#dce8df] bg-[#f0f5f1]">
              <div className="absolute left-[-17px] top-1/2 h-px w-[17px] bg-[#78a58a]" />
              <div className="absolute right-[-17px] top-1/2 h-px w-[17px] bg-[#78a58a]" />
              <div className="absolute left-1/2 top-[-17px] h-[17px] w-px bg-[#78a58a]" />
              <div className="absolute bottom-[-17px] left-1/2 h-[17px] w-px bg-[#78a58a]" />

              <div className="flex h-14 w-14 items-center justify-center rounded-xl bg-[#176b4b] text-white shadow-md shadow-[#176b4b]/15">
                <CircuitBoard className="h-7 w-7" />
              </div>

              <span className="absolute right-2 top-2 h-2 w-2 rounded-full bg-[#d39a5d]" />
              <span className="absolute bottom-2 left-2 h-2 w-2 rounded-full bg-[#78a58a]" />
            </div>

            <h2 className="mt-7 text-base font-semibold text-[#354239]">
              No circuits yet
            </h2>

            <p className="mt-2 max-w-sm text-sm leading-6 text-[#89948d]">
              Your electronic designs will appear here.
            </p>

            <div className="mt-6 inline-flex items-center gap-2 rounded-lg border border-[#dfe5e1] bg-[#f7f9f7] px-4 py-2.5 text-xs font-medium text-[#718078]">
              <Plus className="h-4 w-4" />
              Project creation coming soon
            </div>
          </div>
        </div>

        {error && (
          <p
            role="alert"
            className="mt-5 rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 text-xs text-rose-700"
          >
            {error}
          </p>
        )}
      </section>
    </main>
  )
}
