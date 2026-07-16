import { useState } from 'react'

// Toast 类型
export type ToastType = 'success' | 'error' | 'warning' | 'info'

// Toast 项
export interface ToastItem {
  id: string
  type: ToastType
  message: string
}

// 各类型对应的左边框颜色
const BORDER_COLOR: Record<ToastType, string> = {
  success: '#10b981',
  error: '#ef4444',
  warning: '#f59e0b',
  info: '#3b82f6',
}

// 各类型对应的图标颜色
const ICON_COLOR: Record<ToastType, string> = {
  success: '#10b981',
  error: '#ef4444',
  warning: '#f59e0b',
  info: '#3b82f6',
}

// 各类型对应的 SVG 图标路径
function ToastIcon({ type }: { type: ToastType }) {
  const color = ICON_COLOR[type]
  const common = {
    xmlns: 'http://www.w3.org/2000/svg',
    viewBox: '0 0 24 24',
    fill: 'none',
    stroke: color,
    strokeWidth: 2,
    className: 'w-5 h-5 flex-shrink-0',
  }
  switch (type) {
    case 'success':
      return (
        <svg {...common}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      )
    case 'error':
      return (
        <svg {...common}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" />
        </svg>
      )
    case 'warning':
      return (
        <svg {...common}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
        </svg>
      )
    case 'info':
    default:
      return (
        <svg {...common}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M11.25 11.25l.041-.02a.75.75 0 011.063.852l-.708 2.836a.75.75 0 001.063.853l.041-.021M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-9-3.75h.008v.008H12V8.25z" />
        </svg>
      )
  }
}

// Toast 容器组件（固定在右上角）
export function ToastContainer({
  toasts,
  onRemove,
}: {
  toasts: ToastItem[]
  onRemove: (id: string) => void
}) {
  if (toasts.length === 0) return null

  return (
    <div className="fixed top-4 right-4 z-50 flex flex-col gap-2 w-80 max-w-[calc(100vw-2rem)]">
      {toasts.map((toast) => (
        <div
          key={toast.id}
          className="flex items-start gap-3 bg-white rounded-lg shadow-lg border border-gray-100 p-3 cursor-pointer transition-all hover:shadow-xl"
          style={{ borderLeft: `4px solid ${BORDER_COLOR[toast.type]}` }}
          onClick={() => onRemove(toast.id)}
          title="点击关闭"
        >
          <ToastIcon type={toast.type} />
          <p className="flex-1 text-sm text-gray-800 break-words leading-5">
            {toast.message}
          </p>
          <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth={2}
            className="w-4 h-4 flex-shrink-0 text-gray-400 hover:text-gray-600 transition-colors mt-0.5"
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </div>
      ))}
    </div>
  )
}

// 使用 Toast 的 Hook
// eslint-disable-next-line react-refresh/only-export-components
export function useToast() {
  const [toasts, setToasts] = useState<ToastItem[]>([])

  const show = (type: ToastType, message: string) => {
    const id = Date.now().toString() + Math.random().toString(36).slice(2, 6)
    setToasts((prev) => [...prev, { id, type, message }])
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id))
    }, 3000)
  }

  const remove = (id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id))
  }

  return {
    toasts,
    showSuccess: (msg: string) => show('success', msg),
    showError: (msg: string) => show('error', msg),
    showWarning: (msg: string) => show('warning', msg),
    showInfo: (msg: string) => show('info', msg),
    remove,
  }
}
