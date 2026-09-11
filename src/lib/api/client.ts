import { z } from 'zod'

import { ApiError } from '@/types/api'
import { apiBaseUrl } from './config'

type RequestOptions = Omit<RequestInit, 'body'> & {
  body?: unknown
}

async function parseResponse<T>(
  response: Response,
  schema?: z.ZodType<T>,
): Promise<T> {
  if (response.status === 204) {
    return undefined as T
  }

  const text = await response.text()
  let data: unknown = text
  if (typeof text === 'string' && text.trim()) {
    try {
      data = JSON.parse(text)
    } catch {
      data = text
    }
  }

  if (!response.ok) {
    const message =
      typeof data === 'object' && data && 'message' in data
        ? String((data as { message: string }).message)
        : `Request failed with status ${response.status}`
    const code =
      typeof data === 'object' && data && 'code' in data
        ? String((data as { code: string }).code)
        : undefined
    throw new ApiError(message, response.status, code)
  }

  if (schema) {
    const result = schema.safeParse(data)
    if (result.success) {
      return result.data
    }
    console.warn('API schema validation warning:', result.error)
    return data as T
  }

  return data as T
}

async function request<T>(
  path: string,
  options: RequestOptions = {},
  schema?: z.ZodType<T>,
): Promise<T> {
  const { body, headers, signal, ...rest } = options
  let authHeaders: Record<string, string> = {}
  try {
    const token = typeof window !== 'undefined' ? localStorage.getItem('onivis_token') : null
    if (token) {
      authHeaders = { Authorization: `Bearer ${token}` }
    }
  } catch {
    // Ignore
  }

  const controller = new AbortController()
  const timeoutId = setTimeout(() => controller.abort(), 60000)

  try {
    const response = await fetch(`${apiBaseUrl}${path}`, {
      ...rest,
      signal: signal || controller.signal,
      headers: {
        ...(body !== undefined && !(body instanceof FormData)
          ? { 'Content-Type': 'application/json' }
          : {}),
        ...authHeaders,
        ...headers,
      },
      body:
        body instanceof FormData
          ? body
          : body !== undefined
            ? JSON.stringify(body)
            : undefined,
    })

    return await parseResponse(response, schema)
  } finally {
    clearTimeout(timeoutId)
  }
}

export const apiClient = {
  get<T>(path: string, schema?: z.ZodType<T>) {
    return request<T>(path, { method: 'GET' }, schema)
  },
  post<T>(path: string, body?: unknown, schema?: z.ZodType<T>) {
    return request<T>(path, { method: 'POST', body }, schema)
  },
  patch<T>(path: string, body?: unknown, schema?: z.ZodType<T>) {
    return request<T>(path, { method: 'PATCH', body }, schema)
  },
  delete<T = void>(path: string, schema?: z.ZodType<T>) {
    return request<T>(path, { method: 'DELETE' }, schema)
  },
}
