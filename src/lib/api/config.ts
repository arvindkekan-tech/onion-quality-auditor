const rawUrl = import.meta.env.VITE_API_BASE_URL ?? 'http://127.0.0.1:8000'
const normalized = rawUrl.includes('onivis-api.onrender.com')
  ? 'https://onion-quality-auditor.onrender.com'
  : rawUrl

export const apiBaseUrl = normalized.replace(/\/api\/v1\/?$/, '')

export const useMockApi = import.meta.env.VITE_USE_MOCK_API === 'true'
