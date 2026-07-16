import { createContext, useContext, ReactNode } from 'react'
import { ToastContainer, useToast } from './Toast'

interface ToastContextValue {
  showSuccess: (msg: string) => void
  showError: (msg: string) => void
  showWarning: (msg: string) => void
  showInfo: (msg: string) => void
}

const ToastContext = createContext<ToastContextValue | null>(null)

export function ToastProvider({ children }: { children: ReactNode }) {
  const toast = useToast()
  return (
    <ToastContext.Provider value={toast}>
      {children}
      <ToastContainer toasts={toast.toasts} onRemove={toast.remove} />
    </ToastContext.Provider>
  )
}

// eslint-disable-next-line react-refresh/only-export-components
export function useToastContext() {
  const ctx = useContext(ToastContext)
  if (!ctx) throw new Error('useToastContext必须在ToastProvider内使用')
  return ctx
}
