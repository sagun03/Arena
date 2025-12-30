import axios, { AxiosError, AxiosResponse, InternalAxiosRequestConfig } from 'axios'
import { auth } from './firebase'

type RetriableConfig = InternalAxiosRequestConfig & { _retry?: boolean }

const apiClient = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8000',
})

apiClient.interceptors.request.use(async (config: InternalAxiosRequestConfig) => {
  const user = auth.currentUser
  if (user) {
    const token = await user.getIdToken()
    config.headers = config.headers ?? {}
    ;(config.headers as any).Authorization = `Bearer ${token}`
  }
  return config
})

apiClient.interceptors.response.use(
  (response: AxiosResponse) => response,
  async (error: AxiosError) => {
    const { response, config } = error as AxiosError
    const originalRequest = config as RetriableConfig

    if (response?.status === 401 && originalRequest && !originalRequest._retry) {
      originalRequest._retry = true
      const user = auth.currentUser
      if (user) {
        const token = await user.getIdToken(true)
        originalRequest.headers = originalRequest.headers ?? {}
        ;(originalRequest.headers as any).Authorization = `Bearer ${token}`
        return apiClient(originalRequest)
      }
    }

    return Promise.reject(error)
  }
)

export default apiClient
