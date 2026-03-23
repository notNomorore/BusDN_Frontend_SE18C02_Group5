import api from '../utils/api'

export const getRateableTrip = async (tripId) => {
    const response = await api.get(`/api/ratings/trips/${tripId}`)
    return response.data
}

export const createTripRating = async (payload) => {
    const response = await api.post('/api/ratings', payload)
    return response.data
}

export const getVehicles = async () => {
    const response = await api.get('/api/vehicles')
    return response.data
}

export const getVehicleById = async (vehicleId) => {
    const response = await api.get(`/api/vehicles/${vehicleId}`)
    return response.data
}

export const createVehicle = async (payload) => {
    const response = await api.post('/api/vehicles', payload)
    return response.data
}

export const updateVehicle = async (vehicleId, payload) => {
    const response = await api.put(`/api/vehicles/${vehicleId}`, payload)
    return response.data
}
