import api from '../utils/api'

export const loginUser = async (payload) => {
  const response = await api.post('/api/auth/login', payload)
  return response.data
}

export const changePassword = async (payload) => {
  const response = await api.post('/api/user/change-password', payload)
  return response.data
}

export const activateAccount = async () => {
  const endpoints = ['/api/auth/activate', '/api/user/activate']

  for (const endpoint of endpoints) {
    try {
      const response = await api.post(endpoint)
      return response.data
    } catch (error) {
      const status = error?.response?.status
      if (status === 404 || status === 405) continue
      throw error
    }
  }

  return { ok: true, skipped: true }
}
