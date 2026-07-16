import { useState, useRef, useEffect, useCallback, forwardRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { format, parseISO } from 'date-fns'
import type { SemanticSearchResults, Person, EventItem, Diary } from '../../shared/types'

// 300ms 防抖
const DEBOUNCE_MS = 300
// 最少 2 个字符才触发搜索
const MIN_QUERY_LENGTH = 2

const GlobalSearch = forwardRef<HTMLInputElement>(function GlobalSearch(_props, ref) {
  const navigate = useNavigate()
  const containerRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  const [query, setQuery] = useState('')
  const [results, setResults] = useState<SemanticSearchResults | null>(null)
  const [loading, setLoading] = useState(false)
  const [showPanel, setShowPanel] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // 找出所有结果中的最高分，用于归一化
  const maxScore = (() => {
    if (!results) return 0
    const all: number[] = [
      ...results.persons.map((p) => p.relevance_score),
      ...results.events.map((e) => e.relevance_score),
      ...results.diaries.map((d) => d.relevance_score),
    ]
    return all.length > 0 ? Math.max(...all) : 0
  })()

  // 执行搜索
  const doSearch = useCallback(async (q: string) => {
    if (q.trim().length < MIN_QUERY_LENGTH) {
      setResults(null)
      setShowPanel(false)
      setLoading(false)
      return
    }
    setLoading(true)
    setShowPanel(true)
    try {
      const res = await window.electronAPI.search.semantic(q.trim())
      if (res.success) {
        setResults(res.data)
        setError(null)
      } else {
        setResults({ persons: [], events: [], diaries: [] })
        setError(res.error)
      }
    } catch (e) {
      setResults({ persons: [], events: [], diaries: [] })
      setError(e instanceof Error ? e.message : '搜索失败')
    } finally {
      setLoading(false)
    }
  }, [])

  // 防抖：监听 query 变化
  useEffect(() => {
    if (query.trim().length < MIN_QUERY_LENGTH) {
      setResults(null)
      setShowPanel(false)
      return
    }
    const timer = setTimeout(() => {
      doSearch(query)
    }, DEBOUNCE_MS)
    return () => clearTimeout(timer)
  }, [query, doSearch])

  // 点击外部关闭面板
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setShowPanel(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  // ESC 键清空搜索
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setQuery('')
        setResults(null)
        setShowPanel(false)
        inputRef.current?.blur()
      }
    }
    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [])

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setQuery(e.target.value)
  }

  const handleFocus = () => {
    if (query.trim().length >= MIN_QUERY_LENGTH) {
      setShowPanel(true)
    }
  }

  // 清空搜索
  const clearSearch = () => {
    setQuery('')
    setResults(null)
    setShowPanel(false)
    inputRef.current?.focus()
  }

  // 点击结果后的通用处理：跳转 + 清空
  const handleSelect = (path: string) => {
    navigate(path)
    setQuery('')
    setResults(null)
    setShowPanel(false)
  }

  const handlePersonClick = (p: Person) => {
    // 联系人：直接导航到详情页
    handleSelect(`/persons/${p.id}`)
  }
  const handleEventClick = (e: EventItem) => {
    // 事件：导航到时间线并通过 query 参数高亮该事件
    handleSelect(`/timeline?highlight=event:${e.id}`)
  }
  const handleDiaryClick = (d: Diary) => {
    // 日记：导航到时间线并通过 query 参数高亮该日记
    handleSelect(`/timeline?highlight=diary:${d.id}`)
  }

  // 是否展示空结果提示
  const hasQuery = query.trim().length >= MIN_QUERY_LENGTH
  const isEmpty =
    !loading &&
    results !== null &&
    results.persons.length === 0 &&
    results.events.length === 0 &&
    results.diaries.length === 0

  const formatDate = (dateStr: string): string => {
    try {
      return format(parseISO(dateStr), 'yyyy-MM-dd')
    } catch {
      return dateStr
    }
  }

  const highlightText = (text: string, query: string): React.ReactNode => {
    if (!query || query.trim().length < 2) return text
    const escaped = query.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")
    const regex = new RegExp("(" + escaped + ")", "gi")
    const parts = text.split(regex)
    if (parts.length === 1) return text
    return parts.map((part, i) =>
      i % 2 === 1
        ? <mark key={i} className="bg-amber-200 rounded px-0.5">{part}</mark>
        : part
    )
  }

  return (
    <div ref={containerRef} className="relative w-full max-w-2xl mx-auto">
      {/* 搜索输入框 */}
      <div className="relative">
        {/* 搜索图标 */}
        <svg
          xmlns="http://www.w3.org/2000/svg"
          className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth="2"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M21 21l-4.35-4.35M17 11a6 6 0 11-12 0 6 6 0 0112 0z"
          />
        </svg>
        <input
          ref={(node) => {
            (inputRef as React.MutableRefObject<HTMLInputElement | null>).current = node
            if (typeof ref === 'function') ref(node)
            else if (ref) (ref as React.MutableRefObject<HTMLInputElement | null>).current = node
          }}
          type="text"
          value={query}
          onChange={handleInputChange}
          onFocus={handleFocus}
          placeholder="搜索联系人、事件、日记...  (Ctrl+K)"
          className="w-full border border-gray-300 rounded-lg px-4 py-2 pl-10 pr-9 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
        />
        {/* 清空按钮 */}
        {query && (
          <button
            type="button"
            onClick={clearSearch}
            className="absolute right-2 top-1/2 -translate-y-1/2 w-6 h-6 flex items-center justify-center text-gray-400 hover:text-gray-600 rounded-full hover:bg-gray-100 transition-colors"
            title="清空搜索"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="w-4 h-4"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth="2"
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        )}
      </div>

      {/* 结果下拉面板 */}
      {showPanel && hasQuery && (
        <div className="absolute top-full mt-2 w-full bg-white rounded-lg shadow-lg border border-gray-100 max-h-96 overflow-y-auto z-50">
          {loading && (
            <div className="px-4 py-3 text-sm text-gray-500">搜索中...</div>
          )}

          {!loading && error && (
            <div className="px-4 py-3 text-sm text-red-500">{error}</div>
          )}

          {!loading && !error && isEmpty && (
            <div className="px-4 py-3 text-sm text-gray-500">未找到相关结果</div>
          )}

          {!loading && !error && !isEmpty && results && (
            <div className="py-2">
              {/* 联系人栏 */}
              {results.persons.length > 0 && (
                <SearchSection
                  title="联系人"
                  count={results.persons.length}
                >
                  {results.persons.map((p) => (
                    <ResultItem
                      key={p.id}
                      onClick={() => handlePersonClick(p)}
                      isTop={maxScore > 0 && p.relevance_score === maxScore}
                      relevanceScore={maxScore > 0 ? p.relevance_score / maxScore : 0}
                      avatar={<SearchPersonAvatar name={p.name} avatarPath={p.avatar_path} />}
                      title={highlightText(p.name, query)}
                      subtitle={[p.nickname, p.company].filter(Boolean).join(' · ')}
                    />
                  ))}
                </SearchSection>
              )}

              {/* 事件栏 */}
              {results.events.length > 0 && (
                <SearchSection
                  title="事件"
                  count={results.events.length}
                >
                  {results.events.map((ev) => (
                    <ResultItem
                      key={ev.id}
                      onClick={() => handleEventClick(ev)}
                      isTop={maxScore > 0 && ev.relevance_score === maxScore}
                      relevanceScore={maxScore > 0 ? ev.relevance_score / maxScore : 0}
                      avatar={
                        <div className="w-8 h-8 rounded-full bg-primary-50 flex items-center justify-center flex-shrink-0">
                          <span className="text-base">📅</span>
                        </div>
                      }
                      title={highlightText(ev.title, query)}
                      subtitle={formatDate(ev.event_date)}
                    />
                  ))}
                </SearchSection>
              )}

              {/* 日记栏 */}
              {results.diaries.length > 0 && (
                <SearchSection
                  title="日记"
                  count={results.diaries.length}
                >
                  {results.diaries.map((d) => (
                    <ResultItem
                      key={d.id}
                      onClick={() => handleDiaryClick(d)}
                      isTop={maxScore > 0 && d.relevance_score === maxScore}
                      relevanceScore={maxScore > 0 ? d.relevance_score / maxScore : 0}
                      avatar={
                        <div className="w-8 h-8 rounded-full bg-primary-50 flex items-center justify-center flex-shrink-0">
                          <span className="text-base">📖</span>
                        </div>
                      }
                      title={highlightText(d.title || '\u65e0\u6807\u9898', query)}
                      subtitle={formatDate(d.diary_date)}
                    />
                  ))}
                </SearchSection>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  )
})

export default GlobalSearch

// ==================== 子组件 ====================

interface SearchSectionProps {
  title: React.ReactNode
  count: number
  children: React.ReactNode
}

function SearchSection({ title, count, children }: SearchSectionProps) {
  return (
    <div className="border-b border-gray-50 last:border-b-0">
      <div className="px-4 py-2 flex items-center justify-between bg-gray-50/50">
        <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
          {title}
        </span>
        <span className="text-xs text-gray-400">{count} 项</span>
      </div>
      <div>{children}</div>
    </div>
  )
}

interface ResultItemProps {
  avatar: React.ReactNode
  title: React.ReactNode
  subtitle?: string
  onClick: () => void
  isTop?: boolean
  relevanceScore?: number
}

function relevanceTier(score: number): string {
  if (score >= 0.7) return '高'
  if (score >= 0.4) return '中'
  return '低'
}

function relevanceBarColor(score: number): string {
  if (score >= 0.7) return 'bg-green-400'
  if (score >= 0.4) return 'bg-yellow-400'
  return 'bg-gray-300'
}

function ResultItem({ avatar, title, subtitle, onClick, isTop, relevanceScore = 0 }: ResultItemProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="w-full flex items-center gap-3 px-4 py-2 hover:bg-primary-50 transition-colors text-left"
    >
      {avatar}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5">
          <div className="text-sm text-gray-800 truncate">{title}</div>
          {isTop && (
            <span className="shrink-0 text-[10px] px-1.5 py-0.5 bg-amber-100 text-amber-700 rounded font-medium">
              最佳匹配
            </span>
          )}
        </div>
        {subtitle && (
          <div className="text-xs text-gray-500 truncate">{subtitle}</div>
        )}
        <div className="flex items-center gap-1.5 mt-1">
          <div className="flex-1 h-1 bg-gray-100 rounded-full overflow-hidden">
            <div
              className={`h-full rounded-full ${relevanceBarColor(relevanceScore)}`}
              style={{ width: `${Math.max(2, relevanceScore * 100)}%` }}
            />
          </div>
          <span className="text-[10px] text-gray-400 shrink-0">{relevanceTier(relevanceScore)}</span>
        </div>
      </div>
    </button>
  )
}

// 搜索结果中的联系人头像：有图片则显示，加载失败或无图片时回退到首字母占位
function SearchPersonAvatar({ name, avatarPath }: { name: string; avatarPath?: string }) {
  const [error, setError] = useState(false)
  const initial = name?.charAt(0)?.toUpperCase() || '?'

  if (avatarPath && !error) {
    return (
      <div className="w-8 h-8 rounded-full bg-primary-500 flex items-center justify-center text-white text-sm font-bold flex-shrink-0 overflow-hidden">
        <img
          src={`file:///${avatarPath.replace(/\\/g, '/').replace(/^\//, '')}`}
          alt={name}
          className="w-full h-full object-cover"
          onError={() => setError(true)}
        />
      </div>
    )
  }

  return (
    <div className="w-8 h-8 rounded-full bg-primary-500 flex items-center justify-center text-white text-sm font-bold flex-shrink-0">
      {initial}
    </div>
  )
}
