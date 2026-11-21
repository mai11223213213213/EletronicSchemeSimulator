
import type { CircuitData } from '../model/types'

const API_URL = import.meta.env.DEV
  ? ''
    : (import.meta.env.VITE_API_URL ?? '')

export interface Circuit {
  id: string
  name: string
  data: CircuitData
  createdAt: string
  updatedAt: string
}

interface CircuitsResponse {
  circuits: Circuit[]
}

interface CircuitResponse {
  circuit: Circuit
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
  const response = await fetch(`${API_URL}/api/circuits${path}`, {
    ...options,
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
    },
  })

  const result: unknown = await response.json().catch(() => ({}))

  if (!response.ok) {
    const error = result as ErrorResponse

    throw new ApiError(
      error.message ?? 'Something went wrong',
      response.status,
    )
  }

  return result as T
}

export async function getCircuits(): Promise<Circuit[]> {
  const response = await request<CircuitsResponse>('')
  return response.circuits
}

export async function getCircuit(id: string): Promise<Circuit> {
  const response = await request<CircuitResponse>(`/${id}`)
  return response.circuit
}

export async function createCircuit(
  name = 'Untitled circuit',
): Promise<Circuit> {
  const response = await request<CircuitResponse>('', {
    method: 'POST',
    body: JSON.stringify({ name }),
  })

  return response.circuit
}

export async function updateCircuit(
  id: string,
  data: Partial<Pick<Circuit, 'name' | 'data'>>,
): Promise<Circuit> {
  const response = await request<CircuitResponse>(`/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(data),
  })

  return response.circuit
}

export async function deleteCircuit(id: string): Promise<void> {
  await request(`/${id}`, {
    method: 'DELETE',
  })
}
