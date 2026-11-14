
const API_URL = import.meta.env.DEV
  ? ''
  : (import.meta.env.VITE_API_URL ?? '')

export interface User {
  id: string
  email: string
  createdAt: string
}

interface AuthResponse {
  message: string
  user: User
}

interface MeResponse {
  user: User
}

interface ErrorResponse {
  message?: string
}

class ApiError extends Error {
  public readonly status: number

  constructor(message: string, status: number) {
    super(message)

    this.name = 'ApiError'
    this.status = status
  }
}

async function request<T>(
  path: string,
  options: RequestInit = {},
): Promise<T> {
  const response = await fetch(`${API_URL}/api${path}`, {
    ...options,
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
    },
  })

  const data = await response.json().catch(() => ({}))

  if (!response.ok) {
    const error = data as ErrorResponse

    throw new ApiError(
      error.message ?? 'Something went wrong',
      response.status,
    )
  }

  return data as T
}

export async function getCurrentUser(): Promise<User | null> {
  try {
    const response = await request<MeResponse>('/auth/me')
    return response.user
  } catch (error) {
    if (error instanceof ApiError && error.status === 401) {
      return null
    }

    throw error
  }
}

export async function registerUser(
  email: string,
  password: string,
): Promise<User> {
  const response = await request<AuthResponse>('/auth/register', {
    method: 'POST',
    body: JSON.stringify({ email, password }),
  })

  return response.user
}

export async function loginUser(
  email: string,
  password: string,
): Promise<User> {
  const response = await request<AuthResponse>('/auth/login', {
    method: 'POST',
    body: JSON.stringify({ email, password }),
  })

  return response.user
}

export async function logoutUser(): Promise<void> {
  await request('/auth/logout', {
    method: 'POST',
  })
}
