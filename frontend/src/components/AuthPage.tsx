
import { useState } from 'react'
import { useFormik, type FormikErrors } from 'formik'
import {
  ArrowRight,
  CircuitBoard,
  Cpu,
  LockKeyhole,
  Mail,
  ShieldCheck,
  Sparkles,
  Zap,
} from 'lucide-react'

import { useAuth } from '../auth/AuthContext'
import {
  loginSchema,
  registerSchema,
} from '../validation/authSchemas'

import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Separator } from '@/components/ui/separator'
import { Skeleton } from '@/components/ui/skeleton'

interface FormValues {
  email: string
  password: string
  confirmPassword: string
}

export function AuthPage() {
  const { login, register } = useAuth()
  const [isRegister, setIsRegister] = useState(false)

  const formik = useFormik<FormValues>({
    initialValues: {
      email: '',
      password: '',
      confirmPassword: '',
    },

    validate: (values) => {
      const schema = isRegister ? registerSchema : loginSchema
      const result = schema.safeParse(values)

      if (result.success) return {}

      const errors: FormikErrors<FormValues> = {}

      for (const issue of result.error.issues) {
        const field = issue.path[0]

        if (
          (field === 'email' ||
            field === 'password' ||
            field === 'confirmPassword') &&
          !errors[field]
        ) {
          errors[field] = issue.message
        }
      }

      return errors
    },

    onSubmit: async (values, helpers) => {
      helpers.setStatus(undefined)

      try {
        if (isRegister) {
          const validated = registerSchema.parse(values)
          await register(validated.email, validated.password)
        } else {
          const validated = loginSchema.parse(values)
          await login(validated.email, validated.password)
        }
      } catch (error) {
        helpers.setStatus(
          error instanceof Error
            ? error.message
            : 'Something went wrong. Please try again.',
        )
      }
    },
  })

  function switchMode() {
    if (formik.isSubmitting) return

    setIsRegister((current) => !current)

    formik.resetForm({
      values: {
        email: formik.values.email,
        password: '',
        confirmPassword: '',
      },
    })
  }

  function fieldError(name: keyof FormValues) {
    const error = formik.touched[name] && formik.errors[name]

    if (!error) return null

    return (
      <p id={`${name}-error`} className="mt-1.5 text-xs text-rose-400">
        {error}
      </p>
    )
  }

  const emailError = Boolean(formik.touched.email && formik.errors.email)
  const passwordError = Boolean(
    formik.touched.password && formik.errors.password,
  )
  const confirmPasswordError = Boolean(
    formik.touched.confirmPassword && formik.errors.confirmPassword,
  )

  return (
    <main className="relative flex min-h-screen items-center justify-center overflow-hidden bg-[#101716] px-4 py-8 text-stone-100">
      {/* Background decoration */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute -left-40 -top-40 h-[34rem] w-[34rem] rounded-full bg-orange-500/10 blur-[120px]" />
        <div className="absolute -bottom-48 -right-32 h-[38rem] w-[38rem] rounded-full bg-teal-500/10 blur-[130px]" />

        <div
          className="absolute inset-0 opacity-[0.08]"
          style={{
            backgroundImage:
              'linear-gradient(rgba(148,163,150,0.35) 1px, transparent 1px), linear-gradient(90deg, rgba(148,163,150,0.35) 1px, transparent 1px)',
            backgroundSize: '48px 48px',
          }}
        />

        <svg
          className="absolute right-0 top-0 h-full w-1/2 opacity-[0.12]"
          viewBox="0 0 700 900"
          fill="none"
          aria-hidden="true"
        >
          <path d="M700 120H520V260H390V390H250V530H90" stroke="#5EEAD4" strokeWidth="2" />
          <path d="M700 180H570V320H450V450H320V600H180" stroke="#FB923C" strokeWidth="2" />
          <path d="M700 700H560V620H440V740H300V820H170" stroke="#5EEAD4" strokeWidth="2" />
          <circle cx="390" cy="390" r="6" fill="#5EEAD4" />
          <circle cx="320" cy="600" r="6" fill="#FB923C" />
          <circle cx="440" cy="740" r="6" fill="#5EEAD4" />
        </svg>
      </div>

      <div className="relative z-10 grid w-full max-w-6xl items-center gap-12 lg:grid-cols-[1fr_440px]">
        {/* Branding panel */}
        <section className="hidden lg:block">
          <div className="mb-8 inline-flex items-center gap-3 rounded-full border border-white/10 bg-white/[0.04] px-4 py-2 text-sm text-stone-300 shadow-lg shadow-black/10 backdrop-blur">
            <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-orange-400/15 text-orange-300">
              <CircuitBoard className="h-4 w-4" />
            </span>
            <span>Electronic Scheme Simulator</span>
            <span className="h-1.5 w-1.5 rounded-full bg-teal-400 shadow-[0_0_10px_#2dd4bf]" />
          </div>

          <p className="mb-4 flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.28em] text-teal-300">
            <Sparkles className="h-4 w-4" />
            Design · Connect · Simulate
          </p>

          <h1 className="max-w-xl text-5xl font-semibold leading-[1.12] tracking-tight text-stone-100 xl:text-6xl">
            Bring your
            <span className="block bg-gradient-to-r from-orange-300 via-amber-200 to-teal-200 bg-clip-text text-transparent">
              circuits to life.
            </span>
          </h1>

          <p className="mt-6 max-w-lg text-base leading-7 text-stone-400">
            Build electronic circuits, explore connections and experiment
            with simulations in one creative workspace.
          </p>

          <div className="mt-12 grid max-w-lg grid-cols-2 gap-3">
            <div className="rounded-2xl border border-white/10 bg-white/[0.035] p-4 backdrop-blur">
              <div className="mb-3 flex h-9 w-9 items-center justify-center rounded-xl bg-teal-400/10 text-teal-300">
                <Cpu className="h-5 w-5" />
              </div>
              <p className="text-sm font-medium text-stone-200">Build circuits</p>
              <p className="mt-1 text-xs leading-5 text-stone-500">
                Create and organize your electronic designs.
              </p>
            </div>

            <div className="rounded-2xl border border-white/10 bg-white/[0.035] p-4 backdrop-blur">
              <div className="mb-3 flex h-9 w-9 items-center justify-center rounded-xl bg-orange-400/10 text-orange-300">
                <Zap className="h-5 w-5" />
              </div>
              <p className="text-sm font-medium text-stone-200">Run simulations</p>
              <p className="mt-1 text-xs leading-5 text-stone-500">
                Test ideas and inspect circuit behavior.
              </p>
            </div>
          </div>

          <div className="mt-10 flex items-center gap-2 text-xs text-stone-500">
            <ShieldCheck className="h-4 w-4 text-teal-400" />
            Your workspace, your experiments.
          </div>
        </section>

        {/* Authentication card */}
        <Card className="w-full border-white/10 bg-[#19211f]/95 text-stone-100 shadow-2xl shadow-black/40 backdrop-blur-xl">
          <CardHeader className="space-y-4 px-7 pb-2 pt-8 sm:px-9">
            <div className="flex items-center justify-between">
              <div className="flex h-11 w-11 items-center justify-center rounded-2xl border border-orange-300/20 bg-orange-400/10 text-orange-300 shadow-inner shadow-orange-300/5">
                <CircuitBoard className="h-5 w-5" />
              </div>

              <span className="rounded-full border border-teal-300/15 bg-teal-300/[0.07] px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-teal-300">
                {isRegister ? 'New workspace' : 'Welcome back'}
              </span>
            </div>

            <div>
              <CardTitle className="text-2xl font-semibold tracking-tight text-stone-100">
                {isRegister ? 'Create your account' : 'Sign in to your workspace'}
              </CardTitle>
              <CardDescription className="mt-2 text-sm leading-6 text-stone-400">
                {isRegister
                  ? 'Set up your account and start building electronic circuits.'
                  : 'Enter your details to continue to your circuits.'}
              </CardDescription>
            </div>
          </CardHeader>

          <CardContent className="px-7 pb-8 pt-6 sm:px-9">
            {formik.isSubmitting ? (
              <div
                className="space-y-5"
                aria-label="Submitting form"
                aria-live="polite"
              >
                <div className="space-y-2">
                  <Skeleton className="h-4 w-24 bg-stone-700/70" />
                  <Skeleton className="h-11 w-full rounded-xl bg-stone-700/70" />
                </div>
                <div className="space-y-2">
                  <Skeleton className="h-4 w-20 bg-stone-700/70" />
                  <Skeleton className="h-11 w-full rounded-xl bg-stone-700/70" />
                </div>
                {isRegister && (
                  <div className="space-y-2">
                    <Skeleton className="h-4 w-32 bg-stone-700/70" />
                    <Skeleton className="h-11 w-full rounded-xl bg-stone-700/70" />
                  </div>
                )}
                <Skeleton className="h-11 w-full rounded-xl bg-orange-300/30" />
                <p className="text-center text-xs text-stone-500">
                  {isRegister ? 'Creating your account...' : 'Signing you in...'}
                </p>
              </div>
            ) : (
              <form onSubmit={formik.handleSubmit} noValidate className="space-y-5">
                <div className="space-y-2">
                  <Label htmlFor="email" className="text-xs font-medium text-stone-300">
                    Email address
                  </Label>
                  <div className="relative">
                    <Mail className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-stone-500" />
                    <Input
                      id="email"
                      name="email"
                      type="email"
                      autoComplete="email"
                      placeholder="name@example.com"
                      value={formik.values.email}
                      onChange={formik.handleChange}
                      onBlur={formik.handleBlur}
                      aria-invalid={emailError}
                      aria-describedby={emailError ? 'email-error' : undefined}
                      className="h-11 rounded-xl border-white/10 bg-[#111917] pl-10 text-sm text-stone-100 placeholder:text-stone-600 focus-visible:border-teal-400/60 focus-visible:ring-teal-400/20"
                    />
                  </div>
                  {fieldError('email')}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="password" className="text-xs font-medium text-stone-300">
                    Password
                  </Label>
                  <div className="relative">
                    <LockKeyhole className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-stone-500" />
                    <Input
                      id="password"
                      name="password"
                      type="password"
                      autoComplete={isRegister ? 'new-password' : 'current-password'}
                      placeholder="Enter your password"
                      value={formik.values.password}
                      onChange={formik.handleChange}
                      onBlur={formik.handleBlur}
                      aria-invalid={passwordError}
                      aria-describedby={passwordError ? 'password-error' : undefined}
                      className="h-11 rounded-xl border-white/10 bg-[#111917] pl-10 text-sm text-stone-100 placeholder:text-stone-600 focus-visible:border-teal-400/60 focus-visible:ring-teal-400/20"
                    />
                  </div>
                  {fieldError('password')}
                  {isRegister && (
                    <p className="text-[11px] text-stone-500">
                      Use at least 8 characters.
                    </p>
                  )}
                </div>

                {isRegister && (
                  <div className="space-y-2">
                    <Label
                      htmlFor="confirmPassword"
                      className="text-xs font-medium text-stone-300"
                    >
                      Confirm password
                    </Label>
                    <div className="relative">
                      <ShieldCheck className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-stone-500" />
                      <Input
                        id="confirmPassword"
                        name="confirmPassword"
                        type="password"
                        autoComplete="new-password"
                        placeholder="Enter your password again"
                        value={formik.values.confirmPassword}
                        onChange={formik.handleChange}
                        onBlur={formik.handleBlur}
                        aria-invalid={confirmPasswordError}
                        aria-describedby={
                          confirmPasswordError ? 'confirmPassword-error' : undefined
                        }
                        className="h-11 rounded-xl border-white/10 bg-[#111917] pl-10 text-sm text-stone-100 placeholder:text-stone-600 focus-visible:border-teal-400/60 focus-visible:ring-teal-400/20"
                      />
                    </div>
                    {fieldError('confirmPassword')}
                  </div>
                )}

                {typeof formik.status === 'string' && (
                  <div
                    role="alert"
                    className="rounded-xl border border-rose-400/20 bg-rose-400/[0.08] px-4 py-3 text-sm text-rose-300"
                  >
                    {formik.status}
                  </div>
                )}

                <Button
                  type="submit"
                  className="group h-11 w-full rounded-xl bg-gradient-to-r from-orange-400 to-amber-300 font-semibold text-[#211812] shadow-lg shadow-orange-950/20 transition hover:brightness-110"
                >
                  {isRegister ? 'Create account' : 'Sign in'}
                  <ArrowRight className="ml-2 h-4 w-4 transition-transform group-hover:translate-x-1" />
                </Button>
              </form>
            )}

            <div className="my-6 flex items-center gap-3">
              <Separator className="flex-1 bg-white/10" />
              <span className="text-[10px] uppercase tracking-[0.2em] text-stone-600">
                {isRegister ? 'Already registered?' : 'New to the simulator?'}
              </span>
              <Separator className="flex-1 bg-white/10" />
            </div>

            <Button
              type="button"
              variant="outline"
              disabled={formik.isSubmitting}
              onClick={switchMode}
              className="h-11 w-full rounded-xl border-white/10 bg-white/[0.03] text-sm text-stone-300 hover:border-teal-300/30 hover:bg-teal-300/[0.06] hover:text-teal-200"
            >
              {isRegister ? 'Sign in instead' : 'Create an account'}
            </Button>

            <p className="mt-6 text-center text-[10px] leading-5 text-stone-600">
              By continuing, you agree to use this workspace responsibly.
            </p>
          </CardContent>
        </Card>

        <div className="text-center text-[10px] text-stone-600 lg:hidden">
          Electronic Scheme Simulator · Design · Connect · Simulate
        </div>
      </div>
    </main>
  )
}
