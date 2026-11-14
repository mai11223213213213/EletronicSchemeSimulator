
import { useState, type FormEvent } from 'react'
import { useFormik, type FormikErrors } from 'formik'

import { useAuth } from '../auth/AuthContext'
import {
  loginSchema,
  registerSchema,
} from '../validation/authSchemas'

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

      if (result.success) {
        return {}
      }

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

          await register(
            validated.email,
            validated.password,
          )
        } else {
          const validated = loginSchema.parse(values)

          await login(
            validated.email,
            validated.password,
          )
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
    setIsRegister((current) => !current)

    formik.resetForm({
      values: {
        email: formik.values.email,
        password: '',
        confirmPassword: '',
      },
    })
  }

  function fieldClass(hasError: boolean) {
    return [
      'w-full rounded-lg border px-3 py-2.5 outline-none transition',
      'focus:ring-2',
      hasError
        ? 'border-red-400 focus:border-red-500 focus:ring-red-100'
        : 'border-gray-300 focus:border-blue-500 focus:ring-blue-100',
    ].join(' ')
  }

  function fieldError(
    name: keyof FormValues,
    label: string,
  ) {
    const error = formik.touched[name] && formik.errors[name]

    if (!error) return null

    return (
      <p
        id={`${name}-error`}
        className="mt-1 text-sm text-red-600"
      >
        {error}
      </p>
    )
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-gray-100 px-4 py-8">
      <section className="w-full max-w-md rounded-2xl border border-gray-200 bg-white p-8 shadow-xl">
        <div className="mb-8 text-center">
          <h1 className="text-2xl font-bold text-gray-900">
            Electronic Scheme Simulator
          </h1>

          <p className="mt-2 text-sm text-gray-500">
            {isRegister
              ? 'Create an account to save your circuits'
              : 'Sign in to continue'}
          </p>
        </div>

        <form
          onSubmit={formik.handleSubmit}
          noValidate
          className="space-y-5"
        >
          {/* Email */}
          <div>
            <label
              htmlFor="email"
              className="mb-1 block text-sm font-medium text-gray-700"
            >
              Email address
            </label>

            <input
              id="email"
              name="email"
              type="email"
              autoComplete="email"
              value={formik.values.email}
              onChange={formik.handleChange}
              onBlur={formik.handleBlur}
              placeholder="name@example.com"
              aria-invalid={Boolean(
                formik.touched.email && formik.errors.email,
              )}
              aria-describedby={
                formik.touched.email && formik.errors.email
                  ? 'email-error'
                  : undefined
              }
              className={fieldClass(
                Boolean(formik.touched.email && formik.errors.email),
              )}
            />

            {fieldError('email', 'Email address')}
          </div>

          {/* Password */}
          <div>
            <label
              htmlFor="password"
              className="mb-1 block text-sm font-medium text-gray-700"
            >
              Password
            </label>

            <input
              id="password"
              name="password"
              type="password"
              autoComplete={
                isRegister ? 'new-password' : 'current-password'
              }
              value={formik.values.password}
              onChange={formik.handleChange}
              onBlur={formik.handleBlur}
              placeholder="Enter your password"
              aria-invalid={Boolean(
                formik.touched.password && formik.errors.password,
              )}
              aria-describedby={
                formik.touched.password && formik.errors.password
                  ? 'password-error'
                  : undefined
              }
              className={fieldClass(
                Boolean(
                  formik.touched.password && formik.errors.password,
                ),
              )}
            />

            {fieldError('password', 'Password')}

            {isRegister && (
              <p className="mt-1 text-xs text-gray-500">
                Use at least 8 characters.
              </p>
            )}
          </div>

          {/* Confirm password */}
          {isRegister && (
            <div>
              <label
                htmlFor="confirmPassword"
                className="mb-1 block text-sm font-medium text-gray-700"
              >
                Confirm password
              </label>

              <input
                id="confirmPassword"
                name="confirmPassword"
                type="password"
                autoComplete="new-password"
                value={formik.values.confirmPassword}
                onChange={formik.handleChange}
                onBlur={formik.handleBlur}
                placeholder="Enter your password again"
                aria-invalid={Boolean(
                  formik.touched.confirmPassword &&
                    formik.errors.confirmPassword,
                )}
                aria-describedby={
                  formik.touched.confirmPassword &&
                  formik.errors.confirmPassword
                    ? 'confirmPassword-error'
                    : undefined
                }
                className={fieldClass(
                  Boolean(
                    formik.touched.confirmPassword &&
                      formik.errors.confirmPassword,
                  ),
                )}
              />

              {fieldError('confirmPassword', 'Confirm password')}
            </div>
          )}

          {/* Server error */}
          {typeof formik.status === 'string' && (
            <div
              role="alert"
              className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700"
            >
              {formik.status}
            </div>
          )}

          <button
            type="submit"
            disabled={formik.isSubmitting}
            className="w-full rounded-lg bg-blue-600 px-4 py-3 font-semibold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {formik.isSubmitting
              ? 'Please wait...'
              : isRegister
                ? 'Create account'
                : 'Sign in'}
          </button>
        </form>

        <div className="mt-6 text-center text-sm text-gray-600">
          {isRegister
            ? 'Already have an account?'
            : "Don't have an account?"}

          <button
            type="button"
            onClick={switchMode}
            className="ml-1 font-semibold text-blue-600 hover:text-blue-800"
          >
            {isRegister ? 'Sign in' : 'Create account'}
          </button>
        </div>
      </section>
    </main>
  )
}
