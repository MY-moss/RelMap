import { useState, useEffect } from 'react'

type AiExtractResult = { success: boolean; data?: string[] }
interface AiApi {
  extractKeywords?: (text: string, count: number) => Promise<AiExtractResult | (string[] & { success: undefined; data: undefined })>
}

interface AutoSuggestTagsProps {
  text: string              // 日记文本
  selectedTags: string[]    // 已选标签
  onTagAdd: (tag: string) => void
}

// 建议标签的预设彩色方案（与 TagManager 的预设色保持一致）
const SUGGEST_COLORS: string[] = [
  '#FF9F43', // 橙
  '#6366f1', // 靛蓝
  '#22c55e', // 绿
  '#3b82f6', // 蓝
  '#ec4899', // 粉
  '#eab308', // 黄
]

export default function AutoSuggestTags({
  text,
  selectedTags,
  onTagAdd,
}: AutoSuggestTagsProps) {
  const [suggestions, setSuggestions] = useState<string[]>([])
  const [loading, setLoading] = useState(false)

  // 防抖调用关键词提取（300ms）
  useEffect(() => {
    // 文本过短时不触发
    if (text.length <= 20) {
      setSuggestions([])
      return
    }

    let cancelled = false
    const timer = setTimeout(async () => {
      setLoading(true)
      try {
        // 已注册: 见 electron/preload.ts
        const ai = (window.electronAPI as { ai: AiApi }).ai
        const result = await ai.extractKeywords?.(text, 8)
        if (cancelled) return
        // 方法不存在或返回 undefined 时静默返回
        if (result === undefined) {
          setSuggestions([])
          return
        }
        // 兼容 Result<string[]> 包装结构与裸数组
        const keywords: string[] = result?.success
          ? result.data ?? []
          : Array.isArray(result)
            ? result
            : []
        setSuggestions(keywords)
      } catch {
        // 错误时静默处理（不显示错误）
        if (!cancelled) setSuggestions([])
      } finally {
        if (!cancelled) setLoading(false)
      }
    }, 300)

    return () => {
      cancelled = true
      clearTimeout(timer)
    }
  }, [text])

  // 文本过短时显示引导提示
  if (text.length <= 20) {
    return (
      <div className="text-sm text-gray-400 mt-2">
        输入更多内容获取标签建议
      </div>
    )
  }

  // 加载中状态
  if (loading) {
    return (
      <div className="text-sm text-gray-500 mt-2 flex items-center gap-2">
        <svg
          className="animate-spin w-4 h-4 text-primary-500"
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
          ></circle>
          <path
            className="opacity-75"
            fill="currentColor"
            d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
          ></path>
        </svg>
        <span>分析中...</span>
      </div>
    )
  }

  // 无建议时不渲染列表
  if (suggestions.length === 0) {
    return null
  }

  return (
    <div className="mt-2">
      <p className="text-xs font-medium text-gray-500 mb-2">AI建议标签</p>
      <div className="flex flex-wrap gap-2">
        {suggestions.map((tag, idx) => {
          const isSelected = selectedTags.includes(tag)
          // 已选标签显示灰色，未选标签使用预设彩色
          const color = SUGGEST_COLORS[idx % SUGGEST_COLORS.length]
          return (
            <button
              key={tag}
              type="button"
              onClick={() => {
                if (!isSelected) onTagAdd(tag)
              }}
              disabled={isSelected}
              className={
                isSelected
                  ? 'px-3 py-1 rounded-full text-xs text-gray-400 bg-gray-100 cursor-not-allowed border border-gray-200'
                  : 'px-3 py-1 rounded-full text-xs text-white border border-transparent hover:opacity-90 transition-opacity cursor-pointer'
              }
              style={
                isSelected
                  ? undefined
                  : { backgroundColor: color }
              }
              title={isSelected ? '已添加' : '点击添加标签'}
            >
              {tag}
            </button>
          )
        })}
      </div>
    </div>
  )
}
