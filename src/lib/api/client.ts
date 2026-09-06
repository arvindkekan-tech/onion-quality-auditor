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
  if (response.status === 204 || response.headers.get('content-length') === '0') {
    return undefined as T
  }

  const contentType = response.headers.get('content-type')
  const isJson = contentType?.includes('application/json')
  const text = await response.text()
  const data = isJson && text.trim() ? JSON.parse(text) : text

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
    return schema.parse(data)
  }

  return data as T
}

async function request<T>(
  path: string,
  options: RequestOptions = {},
  schema?: z.ZodType<T>,
): Promise<T> {
  const { body, headers, ...rest } = options
  let authHeaders: Record<string, string> = {}
  try {
    const token = typeof window !== 'undefined' ? localStorage.getItem('onivis_token') : null
    if (token) {
      authHeaders = { Authorization: `Bearer ${token}` }
    }
  } catch {
    // Ignore
  }

  const response = await fetch(`${apiBaseUrl}${path}`, {
    ...rest,
    headers: {
      ...(body instanceof FormData ? {} : { 'Content-Type': 'application/json' }),
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

  return parseResponse(response, schema)
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
