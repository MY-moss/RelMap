import { useState, useEffect } from 'react'

interface DiaryInsightsProps {
  diaryId: string
  content: string
}

const emotionColors: Record<string, string> = {
  positive: 'bg-green-100 text-green-700 border-green-200',
  neutral: 'bg-gray-100 text-gray-600 border-gray-200',
  negative: 'bg-red-100 text-red-700 border-red-200',
}

const emotionLabels: Record<string, string> = {
  positive: '积极',
  neutral: '中性',
  negative: '消极',
}

function scoreToColor(score: number): string {
  if (score > 0.1) return 'bg-green-500'
  if (score < -0.1) return 'bg-red-500'
  return 'bg-gray-400'
}

function scoreToWidth(score: number): string {
  const pct = ((score + 1) / 2) * 100
  return `${Math.max(0, Math.min(100, pct))}%`
}

export default function DiaryInsights({ content }: DiaryInsightsProps) {
  const [expanded, setExpanded] = useState(false)
  const [loading, setLoading] = useState(false)
  const [data, setData] = useState<{
    keywords: string[]
    emotion: { score: number; label: string; positiveWords: string[]; negativeWords: string[] }
  } | null>(null)

  useEffect(() => {
    if (!expanded || data) return
    setLoading(true)
    window.electronAPI.analysis.analyzeDiary(content).then((res) => {
      if (res.success) setData(res.data)
    }).finally(() => setLoading(false))
  }, [expanded, content, data])

  return (
    <div className="mt-3 border-t border-gray-100 pt-2">
      <button
        type="button"
        onClick={() => setExpanded(!expanded)}
        className="flex items-center gap-1 text-xs text-primary-600 hover:text-primary-700 transition-colors"
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          className={`w-3.5 h-3.5 transition-transform ${expanded ? 'rotate-90' : ''}`}
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth="2"
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
        </svg>
        AI 洞察
      </button>

      {expanded && (
        <div className="mt-2 space-y-2 animate-fadeIn">
          {loading && (
            <p className="text-xs text-gray-400">分析中...</p>
          )}

          {!loading && data && (
            <>
              {/* 情感标签 */}
              <div className="flex items-center gap-2">
                <span className="text-xs text-gray-500">情感：</span>
                <span
                  className={`text-xs px-2 py-0.5 rounded-full border ${emotionColors[data.emotion.label] || emotionColors.neutral}`}
                >
                  {emotionLabels[data.emotion.label] || data.emotion.label}
                </span>
              </div>

              {/* 情感得分条 */}
              <div className="flex items-center gap-2">
                <span className="text-xs text-gray-500 shrink-0">得分：</span>
                <div className="flex-1 h-2 bg-gray-100 rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all ${scoreToColor(data.emotion.score)}`}
                    style={{ width: scoreToWidth(data.emotion.score) }}
                  />
                </div>
                <span className="text-xs text-gray-400 w-10 text-right">
                  {data.emotion.score.toFixed(2)}
                </span>
              </div>

              {/* 关键词 */}
              <div className="flex items-start gap-2">
                <span className="text-xs text-gray-500 mt-0.5">关键词：</span>
                <div className="flex flex-wrap gap-1">
                  {data.keywords.map((kw) => (
                    <span
                      key={kw}
                      className="text-xs px-1.5 py-0.5 bg-primary-50 text-primary-600 rounded"
                    >
                      {kw}
                    </span>
                  ))}
                </div>
              </div>
            </>
          )}

          {!loading && !data && (
            <p className="text-xs text-gray-400">无法分析</p>
          )}
        </div>
      )}
    </div>
  )
}
