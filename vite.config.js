import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import { resolve } from 'path'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [vue()],
  resolve: {
    alias: {
      '@': resolve(__dirname, './src'), // 将 @ 指向 src 目录
      '~': resolve(__dirname, './public') // 将 ~ 指向 public 目录
    }
  },
  server: {
    proxy: {
      '/api': {
        target: 'https://sequence.obs.cn-south-1.myhuaweicloud.com',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api/, '')
      },
      // '/path': {
      //   target: 'http://127.0.0.1:5000',
      //   changeOrigin: true, // 改变请求头的来源，使目标服务器认为请求来自自身
      //   rewrite: (path) => path.replace(/^\/path/, '') // 去除 /path 前缀
      // }
    }
  }
})