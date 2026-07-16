import { useState, useEffect } from 'react'

type AiDetectData = {
  new_person: { name: string; company?: string; phone?: string; email?: string }
  duplicates: DuplicateCandidate[]
}
type AiDetectResult = { success: boolean; data?: AiDetectData }
interface AiApi {
  detectDuplicates?: (data: { name: string; company?: string; phone?: string; email?: string }) => Promise<AiDetectResult | (DuplicateCandidate[] & { success: undefined; data: undefined })>
}

interface DuplicateDetectorProps {
  name: string
  company?: string
  phone?: string
  email?: string
  onDuplicateFound: (duplicates: DuplicateCandidate[]) => void
}

// 重复联系人候选项
interface DuplicateCandidate {
  person_id: string
  person_name: string
  similarity: number
  reasons: string[]
}

export default function DuplicateDetector({
  name,
  company,
  phone,
  email,
  onDuplicateFound,
}: DuplicateDetectorProps) {
  const [duplicates, setDuplicates] = useState<DuplicateCandidate[]>([])
  const [loading, setLoading] = useState(false)
  // 已被用户忽略的候选项 id 集合
  const [ignoredIds, setIgnoredIds] = useState<Set<string>>(new Set())

  // 防抖调用重复检测（500ms，避免输入过程中频繁检测）
  useEffect(() => {
    // 姓名过短时不触发
    if (name.length < 2) {
      setDuplicates([])
      setIgnoredIds(new Set())
      return
    }

    let cancelled = false
    const timer = setTimeout(async () => {
      setLoading(true)
      try {
        // 已注册: 见 electron/preload.ts
        const ai = (window.electronAPI as { ai: AiApi }).ai
        const result = await ai.detectDuplicates?.({ name, company, phone, email })
        if (cancelled) return
        // 方法不存在或返回 undefined 时静默返回
        if (result === undefined) {
          setDuplicates([])
          return
        }
        // 兼容 Result<DuplicateResult> 包装结构（data.duplicates 为数组）
        const list: DuplicateCandidate[] = result?.success && result.data
          ? result.data.duplicates ?? []
          : Array.isArray(result)
            ? result
            : []
        setDuplicates(list)
        setIgnoredIds(new Set())
      } catch {
        // 错误时静默处理（不显示错误）
        if (!cancelled) setDuplicates([])
      } finally {
        if (!cancelled) setLoading(false)
      }
    }, 500)

    return () => {
      cancelled = true
      clearTimeout(timer)
    }
  }, [name, company, phone, email])

  // 当检测到重复时回调通知父组件
  useEffect(() => {
    onDuplicateFound(duplicates)
  }, [duplicates, onDuplicateFound])

  // 姓名过短或无重复候选项时不显示任何内容
  if (name.length < 2) return null
  if (duplicates.length === 0 && !loading) return null

  // 过滤掉被用户忽略的候选项
  const visibleDuplicates = duplicates.filter((d) => !ignoredIds.has(d.person_id))

  // 全部被忽略后不显示卡片
  if (visibleDuplicates.length === 0 && !loading) return null

  return (
    <div className="rounded-lg border border-amber-300 bg-amber-50 p-4">
      {/* 标题 + 加载指示器 */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 24 24"
            fill="none"
            stroke="#d97706"
            strokeWidth="2"
            className="w-5 h-5"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z"
            />
          </svg>
          <h3 className="text-sm font-semibold text-amber-800">
            发现可能的重复联系人
          </h3>
        </div>
        {loading && (
          <svg
            className="animate-spin w-4 h-4 text-amber-600"
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
        )}
      </div>

      {/* 重复候选列表 */}
      <ul className="space-y-2">
        {visibleDuplicates.map((candidate) => {
          const similarityPercent = Math.round(candidate.similarity * 100)
          return (
            <li
              key={candidate.person_id}
              className="bg-white rounded-lg border border-amber-200 p-3"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-medium text-gray-800 truncate">
                      {candidate.person_name}
                    </span>
                    <span className="text-xs px-1.5 py-0.5 rounded bg-amber-100 text-amber-700 flex-shrink-0">
                      {similarityPercent}% 相似
                    </span>
                  </div>
                  {candidate.reasons.length > 0 && (
                    <p className="text-xs text-gray-500 mt-1">
                      {candidate.reasons.join('、')}
                    </p>
                  )}
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  <button
                    type="button"
                    onClick={() => {
                      // 触发查看：通过 onDuplicateFound 通知父组件
                      onDuplicateFound(duplicates)
                    }}
                    className="px-2 py-1 text-xs text-primary-600 border border-primary-300 rounded hover:bg-primary-50 transition-colors"
                    title="查看该联系人"
                  >
                    查看
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setIgnoredIds((prev) => {
                        const next = new Set(prev)
                        next.add(candidate.person_id)
                        return next
                      })
                    }}
                    className="px-2 py-1 text-xs text-gray-500 border border-gray-300 rounded hover:bg-gray-50 transition-colors"
                    title="忽略此候选"
                  >
                    忽略
                  </button>
                </div>
              </div>
            </li>
          )
        })}
      </ul>
    </div>
  )
}
