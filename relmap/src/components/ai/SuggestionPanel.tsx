import { useState, useEffect } from 'react'
import type { SuggestionItem } from '../../shared/types'

interface SuggestionPanelProps {
  personId: string
}

const typeConfig = {
  warning: { bg: 'bg-red-50', border: 'border-red-200', text: 'text-red-800', icon: 'text-red-500', label: '警告' },
  info: { bg: 'bg-blue-50', border: 'border-blue-200', text: 'text-blue-800', icon: 'text-blue-500', label: '提示' },
  tip: { bg: 'bg-green-50', border: 'border-green-200', text: 'text-green-800', icon: 'text-green-500', label: '建议' },
}

export default function SuggestionPanel({ personId }: SuggestionPanelProps) {
  const [suggestions, setSuggestions] = useState<SuggestionItem[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    const load = async () => {
      setLoading(true)
      setError(null)
      try {
        const result = await window.electronAPI.suggestion.generate(personId)
        if (cancelled) return
        if (result.success) {
          setSuggestions(result.data)
        } else {
          setError(result.error)
        }
      } catch (e) {
        if (!cancelled) setError((e as Error).message)
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    load()
    return () => { cancelled = true }
  }, [personId])

  if (loading) {
    return (
      <div className="mb-4 p-3 bg-gray-50 rounded-lg border border-gray-100">
        <p className="text-sm text-gray-500">分析中...</p>
      </div>
    )
  }

  if (error) {
    return (
      <div className="mb-4 p-3 bg-red-50 rounded-lg border border-red-200">
        <p className="text-sm text-red-600">{error}</p>
      </div>
    )
  }

  if (suggestions.length === 0) {
    return null
  }

  return (
    <div className="mb-4 space-y-2">
      <h3 className="text-sm font-semibold text-gray-700 flex items-center gap-1">
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-4 h-4 text-primary-500">
          <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09z" />
        </svg>
        沟通建议
      </h3>
      {suggestions.map((s, i) => {
        const cfg = typeConfig[s.type]
        return (
          <div key={i} className={`flex items-start gap-3 p-3 rounded-lg border ${cfg.bg} ${cfg.border}`}>
            <div className={`mt-0.5 flex-shrink-0 ${cfg.icon}`}>
              {s.type === 'warning' ? (
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-4 h-4">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
                </svg>
              ) : s.type === 'info' ? (
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-4 h-4">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M11.25 11.25l.041-.02a.75.75 0 011.063.852l-.708 2.836a.75.75 0 001.063.853l.041-.021M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-9-3.75h.008v.008H12V8.25z" />
                </svg>
              ) : (
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-4 h-4">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09z" />
                </svg>
              )}
            </div>
            <div className="flex-1 min-w-0">
              <p className={`text-sm ${cfg.text}`}>{s.message}</p>
            </div>
            {s.actionLabel && (
              <button className={`flex-shrink-0 text-xs font-medium px-2.5 py-1 rounded-md border ${cfg.border} ${cfg.text} hover:bg-white transition-colors`}>
                {s.actionLabel}
              </button>
            )}
          </div>
        )
      })}
    </div>
  )
}
