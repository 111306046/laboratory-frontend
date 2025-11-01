import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react-swc'


// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    // 保留代理配置作為備用
    proxy: {
      '/api': {
        target: 'https://trochanteral-noncollusive-eunice.ngrok-free.dev',
        changeOrigin: true,
        secure: true,
        rewrite: (path) => path.replace(/^\/api/, '/api')
      }
    },
    // 添加 CORS 支持
    cors: true
  }
})
