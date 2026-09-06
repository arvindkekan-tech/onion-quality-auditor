import { create } from 'zustand'

export type UserProfile = {
  id: string
  email: string
  name: string
  role: string
}

type AuthState = {
  user: UserProfile | null
  token: string | null
  isAuthenticated: boolean
  isLoading: boolean
  login: (token: string, user: UserProfile) => void
  logout: () => void
  initAuth: () => void
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  token: null,
  isAuthenticated: false,
  isLoading: true,
  login: (token: string, user: UserProfile) => {
    try {
      localStorage.setItem('onivis_token', token)
      localStorage.setItem('onivis_user', JSON.stringify(user))
    } catch {
      // Ignore localStorage errors in restricted environments
    }
    set({ user, token, isAuthenticated: true, isLoading: false })
  },
  logout: () => {
    try {
      localStorage.removeItem('onivis_token')
      localStorage.removeItem('onivis_user')
    } catch {
      // Ignore
    }
    set({ user: null, token: null, isAuthenticated: false, isLoading: false })
  },
  initAuth: () => {
    try {
      const token = localStorage.getItem('onivis_token')
      const userStr = localStorage.getItem('onivis_user')
      if (token && userStr) {
        const user = JSON.parse(userStr) as UserProfile
        set({ user, token, isAuthenticated: true, isLoading: false })
        return
      }
    } catch {
      // Reset corrupted state
    }
    set({ user: null, token: null, isAuthenticated: false, isLoading: false })
  },
}))
