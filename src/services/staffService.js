import api from '../utils/api'

export const importStaff = async (file) => {
  const formData = new FormData()
  formData.append('staffFile', file)
  const response = await api.post('/api/admin/staff/import', formData)
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
