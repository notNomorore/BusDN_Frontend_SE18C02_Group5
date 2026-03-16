import { defineConfig, loadEnv } from 'vite'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig(({ mode }) => {
  // Load env file based on `mode` in the current working directory.
  // eslint-disable-next-line no-undef
  const env = loadEnv(mode, process.cwd(), '')
  
  // Đọc từ .env, fallback về 3000 nếu không có
  const API_PORT = env.VITE_API_PORT || '3000'
  const API_URL = env.VITE_API_URL || `http://localhost:${API_PORT}`

  return {
    plugins: [
      tailwindcss(),
    ],
    server: {
      proxy: {
        '/api': {
          target: API_URL,
          changeOrigin: true,
        },
        '/socket.io': {
          target: API_URL,
          ws: true,
          changeOrigin: true,
        }
      }
    }
  }
})