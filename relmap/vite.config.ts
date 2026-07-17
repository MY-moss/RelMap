import { defineConfig, loadEnv } from 'vite'
import path from 'node:path'
import electron from 'vite-plugin-electron/simple'
import react from '@vitejs/plugin-react'
import pkg from './package.json'

export default defineConfig(({ mode }) => {
  // 加载 .env 文件中的环境变量（包括非 VITE_ 前缀的变量）
  const env = loadEnv(mode, process.cwd(), '')

  return {
    define: {
      __APP_VERSION__: JSON.stringify(pkg.version),
      // 将 SENTRY_DSN 注入主进程代码（process.env.SENTRY_DSN）
      'process.env.SENTRY_DSN': JSON.stringify(env.SENTRY_DSN || ''),
    },
    plugins: [
      react(),
      electron({
        main: {
          entry: 'electron/main.ts',
          vite: {
            build: {
              outDir: 'dist-electron',
              rollupOptions: {
                output: {
                  entryFileNames: '[name].mjs',
                },
                external: [
                  'tesseract.js',
                  'face-api.js',
                  'canvas',
                  'better-sqlite3-multiple-ciphers',
                ],
              },
            },
          },
        },
        preload: {
          input: path.join(__dirname, 'electron/preload.ts'),
        },
        renderer: {},
      }),
    ],
    build: {
      target: 'es2020',
      chunkSizeWarningLimit: 1000,
      rollupOptions: {
        output: {
          manualChunks: {
            'react-vendor': ['react', 'react-dom', 'react-router-dom'],
            'chart-vendor': ['recharts', 'cytoscape'],
            'ui-vendor': ['date-fns'],
          },
        },
      },
    },
  }
})
