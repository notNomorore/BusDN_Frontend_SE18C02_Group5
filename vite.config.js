import { fileURLToPath } from 'node:url'
import { defineConfig, loadEnv } from 'vite'
import tailwindcss from '@tailwindcss/vite'

const projectDir = fileURLToPath(new URL('.', import.meta.url))

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, projectDir, '')
  const apiPort = env.VITE_API_PORT || '3000'
  const apiUrl = env.VITE_API_URL || `http://127.0.0.1:${apiPort}`
  const proxyTarget = {
    target: apiUrl,
    changeOrigin: true,
  }

  return {
    plugins: [
      tailwindcss(),
    ],
    server: {
      proxy: {
        '/api': {
          ...proxyTarget,
        },
        '/register-step1': {
          ...proxyTarget,
        },
        '/register-step2': {
          ...proxyTarget,
        },
        '/verify-otp': {
          ...proxyTarget,
        },
        '/create-password': {
          ...proxyTarget,
        },
        '/resend-otp': {
          ...proxyTarget,
        },
        '/forgot-password': {
          ...proxyTarget,
        },
        '/reset-password': {
          ...proxyTarget,
        },
        '/socket.io': {
          ...proxyTarget,
          ws: true,
        },
        '/uploads': {
          ...proxyTarget,
        },
        '/images': {
          ...proxyTarget,
        },
        '/passenger': {
          ...proxyTarget,
        },
        '/auth': {
          ...proxyTarget,
        },
      }
    }
  }
})
