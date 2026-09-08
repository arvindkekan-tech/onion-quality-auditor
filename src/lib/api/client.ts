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

  if (body instanceof FormData) {
    return new Promise<T>((resolve, reject) => {
      const xhr = new XMLHttpRequest()
      xhr.open(options.method || 'POST', `${apiBaseUrl}${path}`)
      for (const [k, v] of Object.entries(authHeaders)) {
        xhr.setRequestHeader(k, v)
      }
      xhr.onload = () => {
        if (xhr.status >= 200 && xhr.status < 300) {
          try {
            const json = xhr.responseText ? JSON.parse(xhr.responseText) : undefined
            resolve(schema ? schema.parse(json) : (json as T))
          } catch (e: any) {
            reject(new ApiError(e.message || 'Invalid response', xhr.status))
          }
        } else {
          let errMsg = `Upload failed with status ${xhr.status}`
          try {
            const errJson = JSON.parse(xhr.responseText)
            if (errJson && errJson.message) errMsg = errJson.message
          } catch {
            // ignore
          }
          reject(new ApiError(errMsg, xhr.status))
        }
      }
      xhr.onerror = () => reject(new ApiError('Network error during upload', 0))
      xhr.send(body)
    })
  }

  const response = await fetch(`${apiBaseUrl}${path}`, {
    ...rest,
    headers: {
      'Content-Type': 'application/json',
      ...authHeaders,
      ...headers,
    },
    body: body !== undefined ? JSON.stringify(body) : undefined,
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
