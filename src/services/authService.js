import api from '../utils/api'
import { extractHtmlErrorMessage, getResponseUrl } from './registrationFlowService'

const isMissingEndpointError = (error) => {
  const status = error?.response?.status
  return status === 404 || status === 405
}

const shouldUseLegacyResetFlow = (error, payload) => {
  const status = error?.response?.status
  return !!payload?.resetToken && (status === 400 || status === 404 || status === 405)
}

const getResponseLocation = (response) => {
  const responseUrl = getResponseUrl(response)

  if (!responseUrl) {
    return {
      url: null,
      path: '',
      token: '',
      email: '',
      success: '',
      error: '',
    }
  }

  try {
    const url = new URL(responseUrl, window.location.origin)
    return {
      url,
      path: url.pathname,
      token: url.searchParams.get('token') || '',
      email: url.searchParams.get('email') || '',
      success: url.searchParams.get('success') || '',
      error: url.searchParams.get('error') || '',
    }
  } catch {
    return {
      url: null,
      path: responseUrl,
      token: '',
      email: '',
      success: '',
      error: '',
    }
  }
}

export const loginUser = async (payload) => {
  const response = await api.post('/api/auth/login', payload)
  return response.data
}

export const requestPasswordResetOtp = async (email) => {
  const response = await api.post('/api/auth/forgot-password', { email })
  return response.data
}

export const verifyPasswordResetOtp = async (payload) => {
  try {
    const response = await api.post('/api/auth/forgot-password/verify-otp', payload)
    return response.data
  } catch (error) {
    if (!isMissingEndpointError(error)) throw error
  }

  const response = await api.post('/verify-otp', {
    ...payload,
    type: 'forgot-password',
  })

  const location = getResponseLocation(response)
  if (location.path === '/reset-password' && location.token) {
    return {
      message: 'OTP verified',
      resetToken: location.token,
      email: location.email || payload.email,
      mode: 'legacy-web',
    }
  }

  const htmlMessage = extractHtmlErrorMessage(response.data)
  throw new Error(htmlMessage || 'Unable to verify OTP.')
}

export const resetPassword = async (payload) => {
  try {
    const response = await api.post('/api/auth/reset-password', payload)
    return response.data
  } catch (error) {
    if (!shouldUseLegacyResetFlow(error, payload)) throw error
  }

  const response = await api.post('/reset-password', {
    email: payload.email,
    token: payload.resetToken,
    newPassword: payload.newPassword,
    confirmPassword: payload.newPassword,
  })

  const location = getResponseLocation(response)
  if (location.path === '/login') {
    return {
      message: location.success || 'Password updated',
      mode: 'legacy-web',
    }
  }

  const htmlMessage = extractHtmlErrorMessage(response.data)
  if (htmlMessage) {
    throw new Error(htmlMessage)
  }

  if (location.error) {
    throw new Error(location.error)
  }

  throw new Error('Unable to reset password.')
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
