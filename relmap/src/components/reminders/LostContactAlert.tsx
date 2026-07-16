import { useEffect, useState } from 'react'
import { format } from 'date-fns'
import type { LostContactItem } from '../../shared/types'

interface LostContactAlertProps {
  months?: number
  onPersonClick?: (personId: string) => void
}

const MAX_VISIBLE = 5

const RefreshIcon = ({ className = '' }: { className?: string }) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    fill="none"
    viewBox="0 0 24 24"
    strokeWidth="2"
    stroke="currentColor"
    className={`w-4 h-4 ${className}`}
  >
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0l3.181 3.183a8.25 8.25 0 0013.803-3.7M4.031 9.865a8.25 8.25 0 0113.803-3.7l3.181 3.182m0-4.991v4.99"
    />
  </svg>
)

export default function LostContactAlert({ months = 3, onPersonClick }: LostContactAlertProps) {
  const api = window.electronAPI
  const [items, setItems] = useState<LostContactItem[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [expanded, setExpanded] = useState(false)

  const load = async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await api.ai.detectLostContacts(months)
      if (res.success) {
        setItems(res.data)
      } else {
        // 接口返回失败时记录错误，避免误显示"所有联系人都在保持联系"
        setError(res.error || '断联检测暂时不可用')
        setItems([])
      }
    } catch (e) {
      // 异常时同样记录错误，不让用户看到误导性的"全部保持联系"状态
      setError(e instanceof Error ? e.message : '断联检测暂时不可用')
      setItems([])
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [months])

  const handleRefresh = () => {
    setExpanded(false)
    load()
  }

  if (loading) {
    return (
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
        <p className="text-sm text-gray-400 text-center">检测中...</p>
      </div>
    )
  }

  // 加载失败时显示错误状态，避免误显示"所有联系人都在保持联系"
  if (error) {
    return (
      <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
              strokeWidth="2"
              stroke="currentColor"
              className="w-5 h-5 text-amber-500 flex-shrink-0"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z"
              />
            </svg>
            <div>
              <h3 className="font-semibold text-amber-800">断联检测暂时不可用</h3>
              <p className="text-xs text-amber-600 mt-0.5">{error}</p>
            </div>
          </div>
          <button
            type="button"
            onClick={handleRefresh}
            className="text-amber-600 hover:text-amber-700 transition-colors"
            title="重试"
          >
            <RefreshIcon />
          </button>
        </div>
      </div>
    )
  }

  if (items.length === 0) {
    return (
      <div className="bg-green-50 border border-green-200 rounded-xl p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
              strokeWidth="2"
              stroke="currentColor"
              className="w-5 h-5 text-green-500 flex-shrink-0"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
            <h3 className="font-semibold text-green-800">所有联系人都在保持联系中 👍</h3>
          </div>
          <button
            type="button"
            onClick={handleRefresh}
            className="text-green-600 hover:text-green-700 transition-colors"
            title="刷新"
          >
            <RefreshIcon />
          </button>
        </div>
      </div>
    )
  }

  const visible = expanded ? items : items.slice(0, MAX_VISIBLE)

  return (
    <div className="bg-red-50 border border-red-200 rounded-xl p-4">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
            strokeWidth="2"
            stroke="currentColor"
            className="w-5 h-5 text-red-500 flex-shrink-0"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z"
            />
          </svg>
          <h3 className="font-semibold text-red-800">⚠️ 断联提醒（{items.length}人）</h3>
        </div>
        <button
          type="button"
          onClick={handleRefresh}
          className="text-red-600 hover:text-red-700 transition-colors"
          title="刷新"
        >
          <RefreshIcon />
        </button>
      </div>
      <ul className="space-y-2">
        {visible.map((item) => (
          <li
            key={item.person.id}
            className="bg-white/60 rounded-lg p-3 flex items-center justify-between gap-3"
          >
            <button
              type="button"
              onClick={() => onPersonClick?.(item.person.id)}
              className="font-medium text-gray-800 hover:text-primary-600 transition-colors text-left truncate"
            >
              {item.person.name}
              {item.person.nickname ? `（${item.person.nickname}）` : ''}
            </button>
            <div className="text-right text-xs text-gray-500 flex-shrink-0">
              <div>已 {item.days_since} 天未联系</div>
              <div>
                最近联系：
                {item.last_interaction
                  ? format(new Date(item.last_interaction), 'yyyy-MM-dd')
                  : '从未联系'}
              </div>
            </div>
          </li>
        ))}
      </ul>
      {items.length > MAX_VISIBLE && (
        <button
          type="button"
          onClick={() => setExpanded((v) => !v)}
          className="mt-2 text-sm text-primary-600 hover:text-primary-700 transition-colors"
        >
          {expanded ? '收起' : `查看全部（${items.length}人）`}
        </button>
      )}
    </div>
  )
}
