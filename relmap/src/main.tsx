import React from 'react'
import ReactDOM from 'react-dom/client'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import App from './App.tsx'
import ErrorBoundary from './components/common/ErrorBoundary'
import './index.css'
import './i18n'

const SENTRY_DSN = import.meta.env.VITE_SENTRY_DSN || ''
const sentryEnabled = localStorage.getItem('sentryEnabled') !== 'false'
const isDev = import.meta.env.DEV

if (SENTRY_DSN && sentryEnabled) {
  import('@sentry/electron/renderer').then((Sentry) => {
    Sentry.init({
      environment: isDev ? 'development' : 'production',
      tracesSampleRate: isDev ? 1.0 : 0.2,
    })
  })
}

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30_000,
      gcTime: 5 * 60_000,
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
})

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <QueryClientProvider client={queryClient}>
      <ErrorBoundary>
        <App />
      </ErrorBoundary>
    </QueryClientProvider>
  </React.StrictMode>,
)


