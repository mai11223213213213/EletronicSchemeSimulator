
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
      <p id={`${name}-error`} className="mt-1.5 text-xs text-rose-600">
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
    <main className="relative flex min-h-screen items-center justify-center overflow-hidden bg-[#f4f1e9] px-4 py-8 text-[#292e29]">
      {/* Background */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute -left-40 -top-40 h-[34rem] w-[34rem] rounded-full bg-[#d9a46c]/20 blur-[120px]" />
        <div className="absolute -bottom-48 -right-32 h-[38rem] w-[38rem] rounded-full bg-[#8da99a]/25 blur-[130px]" />

        <div
          className="absolute inset-0 opacity-[0.16]"
          style={{
            backgroundImage:
              'linear-gradient(rgba(83,102,88,0.18) 1px, transparent 1px), linear-gradient(90deg, rgba(83,102,88,0.18) 1px, transparent 1px)',
            backgroundSize: '48px 48px',
          }}
        />

        <svg
          className="absolute right-0 top-0 h-full w-1/2 opacity-[0.2]"
          viewBox="0 0 700 900"
          fill="none"
          aria-hidden="true"
        >
          <path
            d="M700 120H520V260H390V390H250V530H90"
            stroke="#668b77"
            strokeWidth="2"
          />
          <path
            d="M700 180H570V320H450V450H320V600H180"
            stroke="#c27b43"
            strokeWidth="2"
          />
          <path
            d="M700 700H560V620H440V740H300V820H170"
            stroke="#668b77"
            strokeWidth="2"
          />
          <circle cx="390" cy="390" r="6" fill="#668b77" />
          <circle cx="320" cy="600" r="6" fill="#c27b43" />
          <circle cx="440" cy="740" r="6" fill="#668b77" />
        </svg>
      </div>

      <div className="relative z-10 w-full max-w-md">
        {/* Branding */}
        {/* <section className="hidden lg:block">
          <div className="mb-8 inline-flex items-center gap-3 rounded-full border border-[#d9d4c8] bg-white/60 px-4 py-2 text-sm text-[#626a60] shadow-sm backdrop-blur">
            <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-[#e7d5bd] text-[#a76535]">
              <CircuitBoard className="h-4 w-4" />
            </span>
            <span className="font-medium">Electronic Scheme Simulator</span>
            <span className="h-1.5 w-1.5 rounded-full bg-[#789c83]" />
          </div>

          <p className="mb-4 flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.28em] text-[#718b78]">
            <Sparkles className="h-4 w-4" />
            Design · Connect · Simulate
          </p>

          <h1 className="max-w-xl text-5xl font-semibold leading-[1.12] tracking-tight text-[#30372f] xl:text-6xl">
            Bring your
            <span className="block bg-gradient-to-r from-[#bd7847] via-[#c99a61] to-[#779781] bg-clip-text text-transparent">
              circuits to life.
            </span>
          </h1>

          <p className="mt-6 max-w-lg text-base leading-7 text-[#777d72]">
            Build electronic circuits, explore connections and experiment
            with simulations in one creative workspace.
          </p>

          <div className="mt-12 grid max-w-lg grid-cols-2 gap-3">
            <div className="rounded-2xl border border-[#ded9ce] bg-white/65 p-4 shadow-sm backdrop-blur">
              <div className="mb-3 flex h-9 w-9 items-center justify-center rounded-xl bg-[#e3eee5] text-[#658b70]">
                <Cpu className="h-5 w-5" />
              </div>
              <p className="text-sm font-semibold text-[#414a40]">Build circuits</p>
              <p className="mt-1 text-xs leading-5 text-[#858a80]">
                Create and organize your electronic designs.
              </p>
            </div>

            <div className="rounded-2xl border border-[#ded9ce] bg-white/65 p-4 shadow-sm backdrop-blur">
              <div className="mb-3 flex h-9 w-9 items-center justify-center rounded-xl bg-[#f5e8d9] text-[#b87846]">
                <Zap className="h-5 w-5" />
              </div>
              <p className="text-sm font-semibold text-[#414a40]">Run simulations</p>
              <p className="mt-1 text-xs leading-5 text-[#858a80]">
                Test ideas and inspect circuit behavior.
              </p>
            </div>
          </div>

          <div className="mt-10 flex items-center gap-2 text-xs text-[#858a80]">
            <ShieldCheck className="h-4 w-4 text-[#789c83]" />
            Your workspace, your experiments.
          </div>
        </section> */}

        {/* Authentication card */}
        <Card className="w-full content-center rounded-3xl border border-[#e2ddd2] bg-[#fffefa]/95 text-[#30372f] shadow-[0_24px_80px_rgba(67,62,48,0.12)] backdrop-blur-xl">
          <CardHeader className="space-y-4 px-7 pb-2 pt-8 sm:px-9">
            <div className="flex items-center justify-between">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl border border-[#ead9c5] bg-[#f5e9dc] text-[#b87846]">
                <CircuitBoard className="h-5 w-5" />
              </div>

              <span className="rounded-full border border-[#dce7dc] bg-[#edf3ec] px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-[#718d76]">
                {isRegister ? 'New workspace' : 'Welcome back'}
              </span>
            </div>

            <div>
              <CardTitle className="text-2xl font-semibold tracking-tight text-[#30372f]">
                {isRegister ? 'Create your account' : 'Sign in to your workspace'}
              </CardTitle>
              <CardDescription className="mt-2 text-sm leading-6 text-[#858a80]">
                {isRegister
                  ? 'Set up your account and start building electronic circuits.'
                  : 'Enter your details to continue to your circuits.'}
              </CardDescription>
            </div>
          </CardHeader>

          <CardContent className="px-7 pb-8 pt-6 sm:px-9">
            <form
              onSubmit={formik.handleSubmit}
              noValidate
              className="space-y-5"
            >
              <div className="space-y-2">
                <Label htmlFor="email" className="text-xs font-semibold text-[#596157]">
                  Email address
                </Label>
                <div className="relative">
                  <Mail className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-[#a1a397]" />
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
                    className="h-11 rounded-xl border-[#e3dfd5] bg-[#faf9f5] pl-10 text-sm text-[#30372f] placeholder:text-[#b0afa5] focus-visible:border-[#91a994] focus-visible:ring-[#91a994]/20"
                  />
                </div>
                {fieldError('email')}
              </div>

              <div className="space-y-2">
                <Label htmlFor="password" className="text-xs font-semibold text-[#596157]">
                  Password
                </Label>
                <div className="relative">
                  <LockKeyhole className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-[#a1a397]" />
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
                    className="h-11 rounded-xl border-[#e3dfd5] bg-[#faf9f5] pl-10 text-sm text-[#30372f] placeholder:text-[#b0afa5] focus-visible:border-[#91a994] focus-visible:ring-[#91a994]/20"
                  />
                </div>
                {fieldError('password')}
                {isRegister && (
                  <p className="text-[11px] text-[#99998f]">
                    Use at least 8 characters.
                  </p>
                )}
              </div>

              {isRegister && (
                <div className="space-y-2">
                  <Label
                    htmlFor="confirmPassword"
                    className="text-xs font-semibold text-[#596157]"
                  >
                    Confirm password
                  </Label>
                  <div className="relative">
                    <ShieldCheck className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-[#a1a397]" />
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
                      className="h-11 rounded-xl border-[#e3dfd5] bg-[#faf9f5] pl-10 text-sm text-[#30372f] placeholder:text-[#b0afa5] focus-visible:border-[#91a994] focus-visible:ring-[#91a994]/20"
                    />
                  </div>
                  {fieldError('confirmPassword')}
                </div>
              )}

              {typeof formik.status === 'string' && (
                <div
                  role="alert"
                  className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700"
                >
                  {formik.status}
                </div>
              )}

              <Button
                type="submit"
                disabled={formik.isSubmitting}
                className="group h-11 w-full rounded-xl bg-gradient-to-r from-[#bd7847] to-[#d3a36b] font-semibold text-white shadow-md shadow-[#bd7847]/15 transition hover:brightness-105"
              >
                {formik.isSubmitting
                  ? (isRegister ? 'Creating account...' : 'Signing in...')
                  : (isRegister ? 'Create account' : 'Sign in')}
                {!formik.isSubmitting && (
                  <ArrowRight className="ml-2 h-4 w-4 transition-transform group-hover:translate-x-1" />
                )}
              </Button>
            </form>

            <div className="my-6 flex items-center gap-3">
              <Separator className="flex-1 bg-[#e8e4da]" />
              <span className="text-[10px] uppercase tracking-[0.2em] text-[#aaa99e]">
                {isRegister ? 'Already registered?' : 'New to the simulator?'}
              </span>
              <Separator className="flex-1 bg-[#e8e4da]" />
            </div>

            <Button
              type="button"
              variant="outline"
              disabled={formik.isSubmitting}
              onClick={switchMode}
              className="h-11 w-full rounded-xl border-[#dedbd1] bg-white text-sm text-[#687064] hover:border-[#a8bba9] hover:bg-[#f1f5ef] hover:text-[#58735e]"
            >
              {isRegister ? 'Sign in instead' : 'Create an account'}
            </Button>

            <p className="mt-6 text-center text-[10px] leading-5 text-[#aaa99e]">
              By continuing, you agree to use this workspace responsibly.
            </p>
          </CardContent>
        </Card>

      </div>
    </main>
  )
}
