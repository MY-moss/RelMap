/// <reference types="vite/client" />

declare const __APP_VERSION__: string

// 环境变量类型声明（vite/client 类型未正确加载时的后备）
interface ImportMetaEnv {
  readonly DEV: boolean
  readonly PROD: boolean
  readonly MODE: string
  readonly BASE_URL: string
  readonly VITE_SENTRY_DSN: string
  readonly [key: string]: unknown
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}

interface Window {
  electronAPI: import('./shared/types').ElectronAPI;
}
