import { useState, useEffect, useCallback } from 'react'
import { format } from 'date-fns'
import type { MemoryCapsuleItem } from '../../shared/types'

export default function MemoryCapsule() {
  const [memories, setMemories] = useState<MemoryCapsuleItem[]>([])
  const [currentIndex, setCurrentIndex] = useState(0)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const loadTodayMemories = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const result = await window.electronAPI.memory.today()
      if (result.success) {
        setMemories(result.data)
        setCurrentIndex(0)
      } else {
        setError(result.error)
      }
    } catch (e) {
      setError((e as Error).message)
    } finally {
      setLoading(false)
    }
  }, [])

  const loadRandomMemory = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const result = await window.electronAPI.memory.random()
      if (result.success) {
        setMemories([result.data])
        setCurrentIndex(0)
      } else {
        setError(result.error)
      }
    } catch (e) {
      setError((e as Error).message)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    loadTodayMemories()
  }, [loadTodayMemories])

  const currentMemory = memories[currentIndex]

  const handleNext = () => {
    if (currentIndex < memories.length - 1) {
      setCurrentIndex((i) => i + 1)
    } else {
      setCurrentIndex(0)
    }
  }

  return (
    <div className="bg-gradient-to-br from-purple-50 to-pink-50 dark:from-purple-900/20 dark:to-pink-900/20 rounded-xl shadow-sm border border-purple-100 dark:border-purple-800 p-5 transition-all duration-300">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-5 h-5 text-purple-500">
            <circle cx="12" cy="12" r="10" />
            <polyline points="12 6 12 12 16 14" />
          </svg>
          <h3 className="text-base font-semibold text-purple-700 dark:text-purple-300">
            记忆胶囊
          </h3>
        </div>
        <div className="flex items-center gap-2">
          {memories.length > 1 && (
            <span className="text-xs text-purple-400">
              {currentIndex + 1}/{memories.length}
            </span>
          )}
          <button
            onClick={handleNext}
            disabled={memories.length === 0}
            className="px-3 py-1 text-xs rounded-lg bg-purple-100 dark:bg-purple-800 text-purple-600 dark:text-purple-300 hover:bg-purple-200 dark:hover:bg-purple-700 disabled:opacity-50 transition-colors"
          >
            下一条
          </button>
          <button
            onClick={loadRandomMemory}
            disabled={loading}
            className="px-3 py-1 text-xs rounded-lg bg-pink-100 dark:bg-pink-800 text-pink-600 dark:text-pink-300 hover:bg-pink-200 dark:hover:bg-pink-700 disabled:opacity-50 transition-colors"
          >
            随机回忆
          </button>
        </div>
      </div>

      {loading && (
        <div className="py-6 text-center text-purple-400 text-sm">
          加载中...
        </div>
      )}

      {error && (
        <div className="py-6 text-center text-gray-500 text-sm">
          {error}
        </div>
      )}

      {!loading && !error && memories.length === 0 && (
        <div className="py-6 text-center text-gray-500 text-sm">
          今天没有过去的记忆
        </div>
      )}

      {currentMemory && !loading && (
        <div className="space-y-2 animate-fadeIn">
          <div className="flex items-center gap-2">
            <span className={`px-2 py-0.5 text-xs rounded-full ${
              currentMemory.type === 'event'
                ? 'bg-purple-100 text-purple-600 dark:bg-purple-800 dark:text-purple-300'
                : 'bg-pink-100 text-pink-600 dark:bg-pink-800 dark:text-pink-300'
            }`}>
              {currentMemory.type === 'event' ? '事件' : '日记'}
            </span>
            <span className="text-xs text-purple-400">
              {format(new Date(currentMemory.date + 'T00:00:00'), 'yyyy年MM月dd日')}
            </span>
          </div>
          <p className="text-sm font-medium text-gray-800 dark:text-gray-200 leading-relaxed">
            {currentMemory.title}
          </p>
          {currentMemory.content && (
            <p className="text-xs text-gray-500 dark:text-gray-400 leading-relaxed line-clamp-3">
              {currentMemory.content}
            </p>
          )}
        </div>
      )}
    </div>
  )
}
