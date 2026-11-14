
import { useState } from 'react'
import {
  CircuitBoard,
  Cpu,
  FolderOpen,
  LayoutGrid,
  LogOut,
  Plus,
  UserRound,
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
      {/* Top navigation */}
      <header className="sticky top-0 z-30 border-b border-[#dfe5e1] bg-white">
        <div className="mx-auto flex h-[68px] max-w-[1500px] items-center justify-between px-5 sm:px-8">

          {/* Logo */}
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#176b4b] text-white">
              <CircuitBoard className="h-5 w-5" />
            </div>

            <div>
              <p className="text-sm font-bold tracking-tight text-[#26332d]">
                Electronic Scheme Simulator
              </p>
              <p className="text-[10px] font-medium uppercase tracking-[0.13em] text-[#89948d]">
                Circuit design platform
              </p>
            </div>
          </div>

          {/* Navigation */}
          <nav className="hidden h-full items-center gap-8 sm:flex">
            <div className="flex h-full items-center border-b-[3px] border-[#19845a] px-1 pt-[3px] text-sm font-semibold text-[#176b4b]">
              My circuits
            </div>
          </nav>

          {/* User menu */}
          <div className="flex items-center gap-3">
            <div className="hidden items-center gap-2.5 rounded-xl px-2 py-1.5 sm:flex">
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-[#e5eee8] text-xs font-bold text-[#176b4b]">
                {initials}
              </div>

              <span className="max-w-[190px] truncate text-xs font-medium text-[#536159]">
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

      {/* Page layout */}
      <div className="mx-auto grid max-w-[1500px] grid-cols-1 gap-8 px-5 py-8 sm:px-8 lg:grid-cols-[220px_minmax(0,1fr)] lg:gap-10 lg:py-10">

        {/* Sidebar */}
        <aside className="hidden lg:block">
          <div className="sticky top-24">
            <p className="mb-3 px-3 text-[10px] font-bold uppercase tracking-[0.16em] text-[#929d95]">
              Workspace
            </p>

            <div className="flex items-center gap-3 rounded-xl bg-[#e3eee7] px-3 py-3 text-sm font-semibold text-[#176b4b]">
              <LayoutGrid className="h-[18px] w-[18px]" />
              My circuits
            </div>

            <div className="mt-8 border-t border-[#dfe5e1] pt-5">
              <p className="mb-3 px-3 text-[10px] font-bold uppercase tracking-[0.16em] text-[#929d95]">
                Account
              </p>

              <div className="flex items-center gap-3 rounded-xl px-3 py-3 text-sm text-[#66736a]">
                <UserRound className="h-[18px] w-[18px]" />
                Profile
              </div>
            </div>

            <div className="mt-10 rounded-2xl border border-[#dfe5e1] bg-white p-4">
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-[#e7f0e9] text-[#287b56]">
                <Cpu className="h-5 w-5" />
              </div>

              <p className="mt-3 text-xs font-semibold text-[#3e4c43]">
                Electronic design
              </p>
              <p className="mt-1 text-[11px] leading-5 text-[#8a958d]">
                Build and experiment with your own circuits.
              </p>
            </div>
          </div>
        </aside>

        {/* Main content */}
        <section className="min-w-0">

          {/* Page heading */}
          <div className="flex flex-col justify-between gap-5 border-b border-[#dfe5e1] pb-7 sm:flex-row sm:items-end">
            <div>
              <p className="mb-2 text-xs font-medium text-[#829087]">
                Workspace / My circuits
              </p>

              <h1 className="text-3xl font-semibold tracking-tight text-[#26332d]">
                My circuits
              </h1>

              <p className="mt-2 text-sm text-[#7f8c83]">
                View and manage your electronic circuit designs.
              </p>
            </div>

            <div className="flex items-center gap-2 text-xs text-[#7d8981]">
              <FolderOpen className="h-4 w-4" />
              <span>Personal workspace</span>
            </div>
          </div>

          {/* Projects section */}
          <div className="mt-7">
            <div className="mb-5 flex items-center justify-between">
              <div>
                <h2 className="text-base font-semibold text-[#354239]">
                  Your designs
                </h2>
                <p className="mt-1 text-xs text-[#89948d]">
                  Your saved circuits will appear here.
                </p>
              </div>

              <span className="rounded-lg border border-[#dfe5e1] bg-white px-3 py-1.5 text-[11px] font-medium text-[#7c8980]">
                0 projects
              </span>
            </div>

            {/* Empty state */}
            <div className="flex min-h-[340px] flex-col items-center justify-center rounded-2xl border border-dashed border-[#cbd7ce] bg-white px-6 py-12 text-center">

              {/* Circuit illustration */}
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

              <h3 className="mt-7 text-base font-semibold text-[#354239]">
                No circuits yet
              </h3>

              <p className="mt-2 max-w-sm text-sm leading-6 text-[#89948d]">
                Your electronic designs will appear here.
                Start by exploring the circuit editor.
              </p>

              <div className="mt-6 inline-flex items-center gap-2 rounded-lg border border-[#dfe5e1] bg-[#f7f9f7] px-4 py-2.5 text-xs font-medium text-[#718078]">
                <Plus className="h-4 w-4" />
                Project creation coming soon
              </div>
            </div>
          </div>

          {/* Account information */}
          <div className="mt-8 rounded-2xl border border-[#dfe5e1] bg-white p-5 sm:p-6">
            <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#e7f0e9] text-[#287b56]">
                  <UserRound className="h-5 w-5" />
                </div>

                <div>
                  <h2 className="text-sm font-semibold text-[#354239]">
                    Account information
                  </h2>
                  <p className="mt-1 text-xs text-[#89948d]">
                    Signed in to your personal workspace
                  </p>
                </div>
              </div>

              <div className="sm:text-right">
                <p className="text-[10px] font-semibold uppercase tracking-[0.13em] text-[#9aa49d]">
                  Email address
                </p>
                <p className="mt-1 break-all text-sm font-medium text-[#536159]">
                  {user?.email ?? 'Not available'}
                </p>
              </div>
            </div>

            {error && (
              <p
                role="alert"
                className="mt-4 rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 text-xs text-rose-700"
              >
                {error}
              </p>
            )}
          </div>

          <footer className="mt-10 border-t border-[#dfe5e1] pt-5">
            <p className="text-center text-[11px] text-[#9aa49d] sm:text-left">
              Electronic Scheme Simulator · Design and simulate circuits
            </p>
          </footer>
        </section>
      </div>
    </main>
  )
}
