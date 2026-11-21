
import { useState } from 'react'
import { useFormik, type FormikErrors } from 'formik'
import {
  ArrowRight,
  CircuitBoard,
  LockKeyhole,
  Mail,
  ShieldCheck,
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
    <main className="relative flex min-h-screen items-center justify-center overflow-hidden bg-[#f1f3f2] px-4 py-8 text-[#26332d]">

      {/* Subtle background grid */}
      <div
        className="pointer-events-none absolute inset-0 opacity-40"
        style={{
          backgroundImage:
            'linear-gradient(rgba(83,102,88,0.07) 1px, transparent 1px), linear-gradient(90deg, rgba(83,102,88,0.07) 1px, transparent 1px)',
          backgroundSize: '40px 40px',
        }}
      />

      <div className="relative z-10 w-full max-w-[420px]">

        {/* Brand */}
        <div className="mb-7 flex items-center justify-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-[#176b4b] text-white shadow-sm">
            <CircuitBoard className="h-5 w-5" />
          </div>

          <div>
            <p className="text-sm font-bold tracking-tight text-[#26332d]">
              Electronic Scheme Simulator
            </p>
          </div>
        </div>

        {/* Authentication card */}
        <Card className="w-full rounded-2xl border border-[#dfe5e1] bg-white text-[#26332d] shadow-[0_16px_50px_rgba(38,59,49,0.08)]">

          <CardHeader className="space-y-3 px-7 pb-2 pt-8 sm:px-8">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-[#e5eee8] text-[#176b4b]">
              <LockKeyhole className="h-5 w-5" />
            </div>

            <div>
              <CardTitle className="text-2xl font-semibold tracking-tight text-[#26332d]">
                {isRegister ? 'Create your account' : 'Welcome back'}
              </CardTitle>

              <CardDescription className="mt-2 text-sm leading-6 text-[#849087]">
                {isRegister
                  ? 'Create an account to start designing electronic circuits.'
                  : 'Sign in to access your electronic circuit workspace.'}
              </CardDescription>
            </div>
          </CardHeader>

          <CardContent className="px-7 pb-8 pt-6 sm:px-8">
            <form
              onSubmit={formik.handleSubmit}
              noValidate
              className="space-y-5"
            >
              {/* Email */}
              <div className="space-y-2">
                <Label
                  htmlFor="email"
                  className="text-xs font-semibold text-[#536159]"
                >
                  Email address
                </Label>

                <div className="relative">
                  <Mail className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-[#94a198]" />

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
                    className="h-11 rounded-lg border-[#dfe5e1] bg-[#f7f9f7] pl-10 text-sm text-[#26332d] placeholder:text-[#a3ada6] focus-visible:border-[#6eaa87] focus-visible:ring-[#176b4b]/15"
                  />
                </div>

                {fieldError('email')}
              </div>

              {/* Password */}
              <div className="space-y-2">
                <Label
                  htmlFor="password"
                  className="text-xs font-semibold text-[#536159]"
                >
                  Password
                </Label>

                <div className="relative">
                  <LockKeyhole className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-[#94a198]" />

                  <Input
                    id="password"
                    name="password"
                    type="password"
                    autoComplete={
                      isRegister ? 'new-password' : 'current-password'
                    }
                    placeholder="Enter your password"
                    value={formik.values.password}
                    onChange={formik.handleChange}
                    onBlur={formik.handleBlur}
                    aria-invalid={passwordError}
                    aria-describedby={
                      passwordError ? 'password-error' : undefined
                    }
                    className="h-11 rounded-lg border-[#dfe5e1] bg-[#f7f9f7] pl-10 text-sm text-[#26332d] placeholder:text-[#a3ada6] focus-visible:border-[#6eaa87] focus-visible:ring-[#176b4b]/15"
                  />
                </div>

                {fieldError('password')}

                {isRegister && (
                  <p className="text-[11px] text-[#929d95]">
                    Use at least 8 characters.
                  </p>
                )}
              </div>

              {/* Confirm password */}
              {isRegister && (
                <div className="space-y-2">
                  <Label
                    htmlFor="confirmPassword"
                    className="text-xs font-semibold text-[#536159]"
                  >
                    Confirm password
                  </Label>

                  <div className="relative">
                    <ShieldCheck className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-[#94a198]" />

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
                        confirmPasswordError
                          ? 'confirmPassword-error'
                          : undefined
                      }
                      className="h-11 rounded-lg border-[#dfe5e1] bg-[#f7f9f7] pl-10 text-sm text-[#26332d] placeholder:text-[#a3ada6] focus-visible:border-[#6eaa87] focus-visible:ring-[#176b4b]/15"
                    />
                  </div>

                  {fieldError('confirmPassword')}
                </div>
              )}

              {/* API errors */}
              {typeof formik.status === 'string' && (
                <div
                  role="alert"
                  className="rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700"
                >
                  {formik.status}
                </div>
              )}

              {/* Submit */}
              <Button
                type="submit"
                disabled={formik.isSubmitting}
                className="group h-11 w-full rounded-lg bg-[#176b4b] font-semibold text-white shadow-sm transition hover:bg-[#12563c] disabled:opacity-60"
              >
                {formik.isSubmitting
                  ? isRegister
                    ? 'Creating account...'
                    : 'Signing in...'
                  : isRegister
                    ? 'Create account'
                    : 'Sign in'}

                {!formik.isSubmitting && (
                  <ArrowRight className="ml-2 h-4 w-4 transition-transform group-hover:translate-x-1" />
                )}
              </Button>
            </form>

            <div className="my-6 flex items-center gap-3">
              <Separator className="flex-1 bg-[#e5eae6]" />

              <span className="text-[10px] uppercase tracking-[0.16em] text-[#9ba59e]">
                {isRegister ? 'Already registered?' : 'New to the simulator?'}
              </span>

              <Separator className="flex-1 bg-[#e5eae6]" />
            </div>

            <Button
              type="button"
              variant="outline"
              disabled={formik.isSubmitting}
              onClick={switchMode}
              className="h-11 w-full rounded-lg border-[#dfe5e1] bg-white text-sm text-[#536159] transition hover:border-[#9bbba5] hover:bg-[#f2f7f3] hover:text-[#176b4b]"
            >
              {isRegister ? 'Sign in instead' : 'Create an account'}
            </Button>
          </CardContent>
        </Card>
      </div>
    </main>
  )
}
