import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react-swc'


// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    // 保留代理配置作為備用
    proxy: {
      '/api': {
        target: 'http://13.211.240.55',
        changeOrigin: true,
        secure: false,
        rewrite: (path) => path.replace(/^\/api/, '/api')
      }
    },
    // 添加 CORS 支持
    cors: true
  }
})
