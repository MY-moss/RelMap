import { useState, useEffect, useCallback } from 'react'

type AiGroupResult = { success: boolean; data?: SmartGroupingResult; error?: string }
interface AiApi {
  generateGroupSuggestions?: () => Promise<AiGroupResult>
}

// 智能分组建议
interface GroupSuggestion {
  group_name: string
  group_color: string
  person_ids: string[]
  reason: string
  similarity: number
}

// 智能分组结果
interface SmartGroupingResult {
  suggestions: GroupSuggestion[]
  total_persons: number
  grouped_persons: number
  ungrouped_persons: number
}

interface SmartGroupingPanelProps {
  onApply?: (suggestion: GroupSuggestion) => void
}

export default function SmartGroupingPanel({ onApply }: SmartGroupingPanelProps) {
  const [result, setResult] = useState<SmartGroupingResult | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  // 已应用的分组名称集合，用于禁用重复应用
  const [appliedNames, setAppliedNames] = useState<Set<string>>(new Set())

  const analyze = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      // 已注册: 见 electron/preload.ts
      const ai = (window.electronAPI as { ai: AiApi }).ai
      const res = await ai.generateGroupSuggestions?.()
      // 方法不存在或返回 undefined 时提示未注册
      if (res === undefined) {
        setError('智能分组接口未注册')
        setResult(null)
        return
      }
      if (res?.success) {
        // success 为 true 但 data 缺失时，按错误处理避免进入"三不像"空白状态
        if (!res.data) {
          setError('分析失败：未返回分组数据')
          setResult(null)
          return
        }
        // 兼容 suggestions 字段缺失的情况，统一构造为空数组
        setResult({
          ...res.data,
          suggestions: res.data.suggestions ?? [],
        })
      } else {
        setError(res?.error || '分析失败')
        setResult(null)
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : '分析失败')
      setResult(null)
    } finally {
      setLoading(false)
    }
  }, [])

  // 挂载时自动分析一次
  useEffect(() => {
    analyze()
  }, [analyze])

  const handleApply = (suggestion: GroupSuggestion) => {
    onApply?.(suggestion)
    setAppliedNames((prev) => {
      const next = new Set(prev)
      next.add(suggestion.group_name)
      return next
    })
  }

  return (
    <div>
      {/* 标题 + 重新分析按钮 */}
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold text-gray-800">智能分组建议</h2>
        <button
          onClick={analyze}
          disabled={loading}
          className="px-4 py-2 bg-primary-500 hover:bg-primary-600 text-white rounded-lg transition-colors flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {loading ? (
            <svg
              className="animate-spin w-5 h-5"
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
            >
              <circle
                className="opacity-25"
                cx="12"
                cy="12"
                r="10"
                stroke="currentColor"
                strokeWidth="4"
              />
              <path
                className="opacity-75"
                fill="currentColor"
                d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
              />
            </svg>
          ) : (
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              className="w-5 h-5"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0l3.181 3.183a8.25 8.25 0 0013.803-3.7M4.031 9.865a8.25 8.25 0 0113.803-3.7l3.181 3.182m0-4.991v4.99"
              />
            </svg>
          )}
          <span>{loading ? '分析中...' : '重新分析'}</span>
        </button>
      </div>

      {/* 加载中 */}
      {loading && !result && (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <svg
            className="animate-spin w-10 h-10 text-primary-500 mb-4"
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
          >
            <circle
              className="opacity-25"
              cx="12"
              cy="12"
              r="10"
              stroke="currentColor"
              strokeWidth="4"
            />
            <path
              className="opacity-75"
              fill="currentColor"
              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
            />
          </svg>
          <p className="text-gray-500">正在分析联系人特征...</p>
        </div>
      )}

      {/* 错误提示 */}
      {error && !loading && (
        <div className="text-sm text-red-500 bg-red-50 border border-red-200 rounded-lg px-4 py-3 mb-4">
          {error}
        </div>
      )}

      {/* 统计信息 */}
      {result && (
        <div className="grid grid-cols-3 gap-4 mb-6">
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 text-center">
            <div className="text-2xl font-bold text-gray-800">
              {result.total_persons}
            </div>
            <div className="text-sm text-gray-500 mt-1">总联系人数</div>
          </div>
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 text-center">
            <div className="text-2xl font-bold text-green-600">
              {result.grouped_persons}
            </div>
            <div className="text-sm text-gray-500 mt-1">已分组</div>
          </div>
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 text-center">
            <div className="text-2xl font-bold text-gray-400">
              {result.ungrouped_persons}
            </div>
            <div className="text-sm text-gray-500 mt-1">未分组</div>
          </div>
        </div>
      )}

      {/* 空状态 */}
      {result && result.suggestions.length === 0 && !loading && (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <div className="w-16 h-16 rounded-full bg-gray-100 flex items-center justify-center text-gray-400 mb-4">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.5"
              className="w-8 h-8"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M18 18.72a9.094 9.094 0 003.741-.479 3 3 0 00-4.682-2.72m.94 3.198l.001.031c0 .225-.012.447-.037.666A11.944 11.944 0 0112 21c-2.17 0-4.207-.576-5.963-1.584A6.062 6.062 0 016 18.719m12 0a5.971 5.971 0 00-.941-3.197m0 0A5.995 5.995 0 0012 12.75a5.995 5.995 0 00-5.058 2.772m0 0a3 3 0 00-4.681 2.72 8.986 8.986 0 003.74.477m.94-3.197a5.971 5.971 0 00-.94 3.197M15 6.75a3 3 0 11-6 0 3 3 0 016 0zm6 3a2.25 2.25 0 11-4.5 0 2.25 2.25 0 014.5 0zm-13.5 0a2.25 2.25 0 11-4.5 0 2.25 2.25 0 014.5 0z"
              />
            </svg>
          </div>
          <p className="text-gray-500">暂无分组建议，请先添加联系人信息</p>
        </div>
      )}

      {/* 分组建议卡片列表 */}
      {result && result.suggestions.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {result.suggestions.map((suggestion, idx) => {
            const similarityPercent = Math.round(suggestion.similarity * 100)
            const isApplied = appliedNames.has(suggestion.group_name)
            return (
              <div
                key={`${suggestion.group_name}-${idx}`}
                className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 transition-all hover:shadow-md"
              >
                {/* 分组名称 + 颜色标记 */}
                <div className="flex items-center justify-between gap-2 mb-3">
                  <div className="flex items-center gap-2 min-w-0">
                    <span
                      className="w-4 h-4 rounded-full flex-shrink-0 border border-black/10"
                      style={{ backgroundColor: suggestion.group_color }}
                    />
                    <span className="font-semibold text-gray-800 truncate">
                      {suggestion.group_name}
                    </span>
                  </div>
                  <span className="text-xs px-2 py-0.5 rounded bg-gray-100 text-gray-600 flex-shrink-0">
                    {suggestion.person_ids.length} 人
                  </span>
                </div>

                {/* 分组理由 */}
                <p className="text-sm text-gray-500 mb-3">{suggestion.reason}</p>

                {/* 相似度进度条 */}
                <div className="mb-4">
                  <div className="flex items-center justify-between text-xs text-gray-500 mb-1">
                    <span>相似度</span>
                    <span className="font-medium">{similarityPercent}%</span>
                  </div>
                  <div className="w-full bg-gray-100 rounded-full h-2 overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all"
                      style={{
                        width: `${similarityPercent}%`,
                        backgroundColor: suggestion.group_color,
                      }}
                    />
                  </div>
                </div>

                {/* 应用此分组按钮 */}
                <button
                  onClick={() => handleApply(suggestion)}
                  disabled={isApplied}
                  className="w-full px-3 py-2 text-sm text-white rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  style={{
                    backgroundColor: isApplied ? '#9ca3af' : suggestion.group_color,
                  }}
                >
                  {isApplied ? '已应用' : '应用此分组'}
                </button>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
