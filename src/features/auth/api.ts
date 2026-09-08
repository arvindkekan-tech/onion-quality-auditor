import { apiClient } from '@/lib/api/client'
import type { AuthResponse, ForgotPasswordInput, LoginInput, ResetPasswordInput, SignUpInput } from './types'

export const authApi = {
  async login(data: LoginInput): Promise<AuthResponse> {
    return apiClient.post<AuthResponse>('/auth/login', data)
  },

  async signup(data: SignUpInput): Promise<AuthResponse> {
    return apiClient.post<AuthResponse>('/auth/signup', data)
  },

  async me(): Promise<AuthResponse['user']> {
    return apiClient.get<AuthResponse['user']>('/auth/me')
  },

  async forgotPassword(data: ForgotPasswordInput): Promise<{ success: boolean; message: string }> {
    return apiClient.post<{ success: boolean; message: string }>('/auth/forgot-password', data)
  },

  async resetPassword(data: ResetPasswordInput): Promise<{ success: boolean; message: string }> {
    return apiClient.post<{ success: boolean; message: string }>('/auth/reset-password', data)
  },

  async updateProfile(data: { name: string }): Promise<AuthResponse['user']> {
    return apiClient.patch<AuthResponse['user']>('/auth/me', data)
  },
}
