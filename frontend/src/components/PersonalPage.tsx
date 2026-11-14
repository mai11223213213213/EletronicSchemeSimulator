
import { useState } from 'react'
import {
  CircuitBoard,
  FolderOpen,
  LogOut,
  
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

  return (
    <main className="relative min-h-screen overflow-hidden bg-[#f4f1e9] text-[#30372f]">
      {/* Background */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute -right-40 -top-40 h-[34rem] w-[34rem] rounded-full bg-[#d9a46c]/20 blur-[120px]" />
        <div className="absolute -bottom-48 -left-32 h-[38rem] w-[38rem] rounded-full bg-[#8da99a]/25 blur-[130px]" />

        <div
          className="absolute inset-0 opacity-[0.14]"
          style={{
            backgroundImage:
              'linear-gradient(rgba(83,102,88,0.18) 1px, transparent 1px), linear-gradient(90deg, rgba(83,102,88,0.18) 1px, transparent 1px)',
            backgroundSize: '48px 48px',
          }}
        />
      </div>

      <div className="relative z-10 mx-auto min-h-screen w-full max-w-7xl px-5 py-6 sm:px-8 lg:px-12">
        {/* Header */}
        <header className="flex items-center justify-between border-b border-[#ded9ce] pb-5">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl border border-[#ead9c5] bg-[#f5e9dc] text-[#b87846]">
              <CircuitBoard className="h-5 w-5" />
            </div>

            <div>
              <p className="text-sm font-semibold tracking-tight text-[#30372f]">
                Electronic Scheme Simulator
              </p>
              <p className="text-xs text-[#929489]">
                Your creative workspace
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={handleLogout}
            disabled={isLoggingOut}
            className="inline-flex items-center gap-2 rounded-xl border border-[#dedbd1] bg-white/70 px-4 py-2.5 text-sm font-medium text-[#687064] shadow-sm transition hover:border-[#d2b99d] hover:bg-white hover:text-[#a76535] disabled:cursor-not-allowed disabled:opacity-60"
          >
            <LogOut className="h-4 w-4" />
            {isLoggingOut ? 'Signing out...' : 'Sign out'}
          </button>
        </header>

        {/* Main content */}
        <section className="pt-12 sm:pt-16">
          <div className="max-w-2xl">
            <p className="mb-3 text-xs font-semibold uppercase tracking-[0.24em] text-[#829783]">
              Personal workspace
            </p>

            <h1 className="text-3xl font-semibold tracking-tight text-[#30372f] sm:text-4xl">
              Welcome back!
            </h1>

            <p className="mt-3 max-w-xl text-sm leading-7 text-[#858a80] sm:text-base">
              This is your personal space. You can manage your account
              and access your electronic design workspace from here.
            </p>
          </div>

          {/* Account card */}
          <div className="mt-10 grid gap-5 lg:grid-cols-[minmax(0,1fr)_320px]">
            <section className="rounded-3xl border border-[#e2ddd2] bg-[#fffefa]/90 p-6 shadow-[0_16px_50px_rgba(67,62,48,0.07)] backdrop-blur-xl sm:p-8">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#edf3ec] text-[#718d76]">
                  <FolderOpen className="h-5 w-5" />
                </div>

                <div>
                  <h2 className="font-semibold text-[#414a40]">
                    Your projects
                  </h2>
                  <p className="text-xs text-[#99998f]">
                    Your electronic designs
                  </p>
                </div>
              </div>

              <div className="mt-8 flex min-h-52 flex-col items-center justify-center rounded-2xl border border-dashed border-[#dedbd1] bg-[#faf9f5]/80 px-5 py-8 text-center">
                <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-[#f5e9dc] text-[#b87846]">
                  <CircuitBoard className="h-6 w-6" />
                </div>

                <h3 className="mt-4 text-sm font-semibold text-[#596157]">
                  Your workspace is ready
                </h3>

                <p className="mt-2 max-w-sm text-xs leading-6 text-[#99998f]">
                  Your circuit projects will appear here when project
                  saving is available.
                </p>
              </div>
            </section>

            {/* Account details */}
            <aside className="rounded-3xl border border-[#e2ddd2] bg-[#fffefa]/90 p-6 shadow-[0_16px_50px_rgba(67,62,48,0.07)] backdrop-blur-xl">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#f5e9dc] text-[#b87846]">
                  <UserRound className="h-5 w-5" />
                </div>

                <div>
                  <h2 className="font-semibold text-[#414a40]">
                    Account
                  </h2>
                  <p className="text-xs text-[#99998f]">
                    Your account details
                  </p>
                </div>
              </div>

              <div className="mt-7">
                <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-[#a1a397]">
                  Email address
                </p>

                <p className="mt-2 break-all text-sm font-medium text-[#596157]">
                  {user?.email ?? 'Not available'}
                </p>
              </div>

              <div className="my-6 h-px bg-[#e8e4da]" />

              <p className="text-xs leading-6 text-[#929489]">
                Your account is used to access your personal workspace.
              </p>

              {error && (
                <p
                  role="alert"
                  className="mt-4 rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-xs text-rose-700"
                >
                  {error}
                </p>
              )}
            </aside>
          </div>
        </section>

        <footer className="mt-16 border-t border-[#ded9ce] py-5">
          <p className="text-center text-xs text-[#aaa99e]">
            Electronic Scheme Simulator
          </p>
        </footer>
      </div>
    </main>
  )
}
