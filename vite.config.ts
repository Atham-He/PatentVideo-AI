import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import path from "path"

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, '.', '');
  return {
    plugins: [react(), tailwindcss()],
    define: {
      'process.env.MESHY_API_KEY': JSON.stringify(env.MESHY_API_KEY),
      'process.env.API_KEY': JSON.stringify(env.GEMINI_API_KEY),
      'process.env.GEMINI_API_KEY': JSON.stringify(env.GEMINI_API_KEY)
    },
    resolve: {
      alias: {
        "@": path.resolve(__dirname, "./src"),
      },
    },
    server: {
      proxy: {
        '/api/meshy': {
          target: 'https://api.meshy.ai',
          changeOrigin: true,
          rewrite: (path) => path.replace(/^\/api\/meshy/, ''),
          secure: true
        },
        '/api/assets': {
          target: 'https://assets.meshy.ai',
          changeOrigin: true,
          rewrite: (path) => path.replace(/^\/api\/assets/, ''),
          secure: true
        }
      }
    }
  }
})
