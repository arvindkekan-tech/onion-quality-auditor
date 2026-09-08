export const apiBaseUrl =
  import.meta.env.VITE_API_BASE_URL &&
  !import.meta.env.VITE_API_BASE_URL.includes('127.0.0.1') &&
  !import.meta.env.VITE_API_BASE_URL.includes('localhost')
    ? import.meta.env.VITE_API_BASE_URL.replace(/\/api\/v1\/?$/, '')
    : 'https://onivis-api.onrender.com'

export const useMockApi = import.meta.env.VITE_USE_MOCK_API === 'true'

