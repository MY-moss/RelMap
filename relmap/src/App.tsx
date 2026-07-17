import { useState, useEffect } from 'react'
import { HashRouter, Routes, Route } from 'react-router-dom'
import { lazy, Suspense } from 'react'
import ErrorBoundary from './components/common/ErrorBoundary'
import { ToastProvider } from './components/common/ToastContext'
import UpdateNotifier from './components/common/UpdateNotifier'
import AppLayout from './components/layout/AppLayout'
import LockScreen from './components/settings/LockScreen'
import TelemetryConsent from './components/settings/TelemetryConsent'
import { useNotifications } from './hooks/useNotifications'
import { useUIStore } from './hooks/stores'
import type { ColorTheme, GlassMode } from './hooks/stores/useUIStore'

const HomePage = lazy(() => import('./pages/HomePage'))
const FollowUpPage = lazy(() => import('./pages/FollowUpPage'))
const PersonsPage = lazy(() => import('./pages/PersonsPage'))
const PersonDetailPage = lazy(() => import('./pages/PersonDetailPage'))
const GraphPage = lazy(() => import('./pages/GraphPage'))
const TimelinePage = lazy(() => import('./pages/TimelinePage'))
const PhotosPage = lazy(() => import('./pages/PhotosPage'))
const SettingsPage = lazy(() => import('./pages/SettingsPage'))
const HelpPage = lazy(() => import('./pages/HelpPage'))
const WrappedPage = lazy(() => import('./pages/WrappedPage'))
const AnalyticsPage = lazy(() => import('./pages/AnalyticsPage'))
const AiChatPage = lazy(() => import('./pages/AiChatPage'))

function NotificationInit() {
  useNotifications()
  return null
}

export default function App() {
  const [locked, setLocked] = useState(true)
  const [checking, setChecking] = useState(true)
  const setDarkMode = useUIStore((s) => s.setDarkMode)
  const setColorTheme = useUIStore((s) => s.setColorTheme)
  const setGlassMode = useUIStore((s) => s.setGlassMode)

  useEffect(() => {
    window.electronAPI.app.getStartupConfig().then((r) => {
      if (r.success && r.data) {
        if (r.data.config.darkMode === true) {
          document.documentElement.classList.add('dark')
          setDarkMode(true)
        }
        const savedTheme = r.data.config.colorTheme as ColorTheme | undefined
        if (savedTheme) {
          document.documentElement.setAttribute('data-theme', savedTheme)
          setColorTheme(savedTheme)
        }
        const savedGlass = r.data.config.glassMode as GlassMode | undefined
        if (savedGlass && savedGlass !== 'none') {
          document.documentElement.classList.add(`glass-${savedGlass}`)
          setGlassMode(savedGlass)
        }
        setLocked(r.data.hasPin)
      }
      setChecking(false)
    })
  }, [setDarkMode, setColorTheme, setGlassMode])

  if (checking) {
    return (
      <div className="flex items-center justify-center h-screen bg-gray-50">
        <p className="text-gray-500">加载中...</p>
      </div>
    )
  }

  if (locked) {
    return <LockScreen onUnlocked={() => setLocked(false)} />
  }

  return (
    <ErrorBoundary>
      <ToastProvider>
        <TelemetryConsent />
        <UpdateNotifier />
        <HashRouter>
          <NotificationInit />
          <Suspense fallback={<div className="p-6 text-gray-500">加载中...</div>}>
            <Routes>
              <Route element={<AppLayout />}>
                <Route index element={<ErrorBoundary><HomePage /></ErrorBoundary>} />
                <Route path="follow-up" element={<ErrorBoundary><FollowUpPage /></ErrorBoundary>} />
                <Route path="persons" element={<ErrorBoundary><PersonsPage /></ErrorBoundary>} />
                <Route path="persons/:id" element={<ErrorBoundary><PersonDetailPage /></ErrorBoundary>} />
                <Route path="graph" element={<ErrorBoundary><GraphPage /></ErrorBoundary>} />
                <Route path="timeline" element={<ErrorBoundary><TimelinePage /></ErrorBoundary>} />
                <Route path="photos" element={<ErrorBoundary><PhotosPage /></ErrorBoundary>} />
                <Route path="settings" element={<ErrorBoundary><SettingsPage /></ErrorBoundary>} />
                <Route path="help" element={<ErrorBoundary><HelpPage /></ErrorBoundary>} />
                <Route path="analytics" element={<ErrorBoundary><AnalyticsPage /></ErrorBoundary>} />
                <Route path="wrapped" element={<ErrorBoundary><WrappedPage /></ErrorBoundary>} />
                <Route path="ai" element={<ErrorBoundary><AiChatPage /></ErrorBoundary>} />
              </Route>
            </Routes>
          </Suspense>
        </HashRouter>
      </ToastProvider>
    </ErrorBoundary>
  )
}
