import { useState, useEffect } from 'react'

type AiEmotionResult = { success: boolean; data?: EmotionResult }
interface AiApi {
  analyzeEmotion?: (text: string) => Promise<AiEmotionResult | (EmotionResult & { success: undefined; data: undefined })>
}

interface EmotionIndicatorProps {
  text: string
  onEmotionAnalyzed?: (result: EmotionResult) => void
}

// 情感分析结果
interface EmotionResult {
  score: number
  label: 'positive' | 'neutral' | 'negative'
  positiveWords: string[]
  negativeWords: string[]
}

export default function EmotionIndicator({
  text,
  onEmotionAnalyzed,
}: EmotionIndicatorProps) {
  const [emotion, setEmotion] = useState<EmotionResult | null>(null)
  const [loading, setLoading] = useState(false)

  // 防抖调用情感分析（500ms）
  useEffect(() => {
    // 文本过短时不触发
    if (text.length <= 30) {
      setEmotion(null)
      return
    }

    let cancelled = false
    const timer = setTimeout(async () => {
      setLoading(true)
      try {
        // 已注册: 见 electron/preload.ts
        const ai = (window.electronAPI as { ai: AiApi }).ai
        const result = await ai.analyzeEmotion?.(text)
        if (cancelled) return
        // 方法不存在或返回 undefined 时静默返回
        if (result === undefined) {
          setEmotion(null)
          return
        }
        // 兼容 Result<EmotionResult> 包装结构与裸对象
        const data: EmotionResult | null = result?.success
          ? result.data ?? null
          : (result as EmotionResult) ?? null
        setEmotion(data)
        if (data) {
          onEmotionAnalyzed?.(data)
        }
      } catch {
        // 错误时静默处理（不显示错误）
        if (!cancelled) setEmotion(null)
      } finally {
        if (!cancelled) setLoading(false)
      }
    }, 500)

    return () => {
      cancelled = true
      clearTimeout(timer)
    }
  }, [text, onEmotionAnalyzed])

  // 文本过短时不显示任何内容
  if (text.length <= 30) return null

  // 加载中状态
  if (loading) {
    return (
      <span className="inline-flex items-center gap-1.5 text-xs text-gray-500">
        <svg
          className="animate-spin w-3.5 h-3.5 text-primary-500"
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
      </span>
    )
  }

  // 无分析结果时不显示
  if (!emotion) return null

  // 根据情感标签配置图标、文字与颜色
  const config = {
    positive: {
      label: '积极',
      color: 'text-green-600',
      bg: 'bg-green-50',
      icon: (
        <svg
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          className="w-4 h-4"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M15.182 15.182a4.5 4.5 0 01-6.364 0M21 12a9 9 0 11-18 0 9 9 0 0118 0zM9.75 9.75c0 .414-.168.75-.375.75S9 10.164 9 9.75 9.168 9 9.375 9s.375.336.375.75zm5.25 0c0 .414-.168.75-.375.75S15 10.164 15 9.75 15.168 9 15.375 9s.375.336.375.75z"
          />
        </svg>
      ),
    },
    neutral: {
      label: '中性',
      color: 'text-gray-500',
      bg: 'bg-gray-50',
      icon: (
        <svg
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          className="w-4 h-4"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M21 12a9 9 0 11-18 0 9 9 0 0118 0zM9 9.75c0 .414-.168.75-.375.75S8.25 10.164 8.25 9.75 8.418 9 8.625 9s.375.336.375.75zm6 0c0 .414-.168.75-.375.75s-.375-.336-.375-.75.168-.75.375-.75.375.336.375.75zm-3 7.5h.008v.008H12v-.008z"
          />
        </svg>
      ),
    },
    negative: {
      label: '消极',
      color: 'text-red-500',
      bg: 'bg-red-50',
      icon: (
        <svg
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          className="w-4 h-4"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M15.182 16.182a4.5 4.5 0 00-6.364 0M21 12a9 9 0 11-18 0 9 9 0 0118 0zM9.75 9.75c0 .414-.168.75-.375.75S9 10.164 9 9.75 9.168 9 9.375 9s.375.336.375.75zm5.25 0c0 .414-.168.75-.375.75S15 10.164 15 9.75 15.168 9 15.375 9s.375.336.375.75z"
          />
        </svg>
      ),
    },
  } as const

  const current = config[emotion.label] ?? config.neutral

  // 拼接匹配到的情感词列表作为 tooltip 内容
  const wordsParts: string[] = []
  if (emotion.positiveWords.length > 0) {
    wordsParts.push(`积极词: ${emotion.positiveWords.join('、')}`)
  }
  if (emotion.negativeWords.length > 0) {
    wordsParts.push(`消极词: ${emotion.negativeWords.join('、')}`)
  }
  const tooltipText = wordsParts.length > 0 ? wordsParts.join('\n') : '暂无匹配情感词'

  return (
    <span
      className={`relative group inline-flex items-center gap-1.5 text-xs ${current.color} ${current.bg} px-2 py-1 rounded-full`}
      title={tooltipText}
    >
      {current.icon}
      <span>{current.label}</span>
      {/* 悬停 tooltip：展示匹配到的情感词列表 */}
      <span className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1 hidden group-hover:block whitespace-pre-line bg-gray-800 text-white text-xs rounded px-2 py-1 shadow-lg z-10 min-w-max max-w-xs">
        {tooltipText}
      </span>
    </span>
  )
}
