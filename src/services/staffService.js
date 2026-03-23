import api from '../utils/api'

const API_BASE_URL = (import.meta.env.VITE_API_URL || `http://localhost:${import.meta.env.VITE_API_PORT || '3000'}`).replace(/\/$/, '')

export const importStaff = async (file) => {
  const formData = new FormData()
  formData.append('staffFile', file)
  const response = await api.post(`${API_BASE_URL}/api/admin/staff/import`, formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  })
  return response.data
}

export const createStaff = async (payload) => {
  const response = await api.post('/api/admin/users/create', payload)
  return response.data
}

export const resetStaffPassword = async (userId) => {
  const response = await api.post(`/api/admin/staff/${userId}/reset-password`)
  return response.data
}

export const toggleStaffLock = async (userId) => {
  const response = await api.post(`/api/admin/users/${userId}/toggle-lock`)
  return response.data
}

export const fetchStaffList = async ({ page = 1, limit = 10, role = 'ALL', search = '' } = {}) => {
  const response = await api.get(`/api/admin/users?page=${page}&limit=${limit}&role=${role}&search=${encodeURIComponent(search)}`)
  return response.data
}
