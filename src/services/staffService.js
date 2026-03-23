import api from '../utils/api'

const API_BASE_URL = (import.meta.env.VITE_API_URL || `http://localhost:${import.meta.env.VITE_API_PORT || '3000'}`).replace(/\/$/, '')

export const importStaff = async (file) => {
  const formData = new FormData()
  formData.append('staffFile', file)

  const response = await api.post(`${API_BASE_URL}/admin/staff/import`, formData, {
    headers: {
      'Content-Type': 'multipart/form-data',
    },
  })

  return response.data
}
