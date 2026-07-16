import { useState, useEffect, useCallback, useRef } from 'react'
import { useSearchParams } from 'react-router-dom'
import type { EventItem, Diary } from '../shared/types'
import EventCard from '../components/events/EventCard'
import DiaryCard from '../components/diaries/DiaryCard'
import EmptyState from '../components/common/EmptyState'

type TimelineEntry =
  | (EventItem & { _type: 'event'; _sortDate: string })
  | (Diary & { _type: 'diary'; _sortDate: string })

type TypeFilter = 'all' | 'event' | 'diary'

export default function TimelinePage() {
  const [items, setItems] = useState<TimelineEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [keyword, setKeyword] = useState('')
  const [debouncedKeyword, setDebouncedKeyword] = useState('')
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')
  const [typeFilter, setTypeFilter] = useState<TypeFilter>('all')

  // 高亮目标：来自全局搜索的 query 参数，格式为 "event:<id>" 或 "diary:<id>"
  const [searchParams] = useSearchParams()
  const highlightParam = searchParams.get('highlight') || ''
  const [highlightType, highlightId] = highlightParam.includes(':')
    ? highlightParam.split(':')
    : ['', '']
  const highlightRef = useRef<HTMLDivElement>(null)

  // 关键词搜索防抖（300ms）
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedKeyword(keyword)
    }, 300)
    return () => clearTimeout(timer)
  }, [keyword])

  // 数据加载函数（使用 useCallback 包裹，监听筛选条件变化）
  // 带 requestId 取消标记，防止快速输入时旧请求覆盖新结果
  const requestIdRef = useRef(0)
  const loadData = useCallback(async () => {
    const currentId = ++requestIdRef.current
    setLoading(true)
    try {
      const filter = {
        keyword: debouncedKeyword || undefined,
        start_date: startDate || undefined,
        end_date: endDate || undefined,
      }
      const [eventResult, diaryResult] = await Promise.all([
        window.electronAPI.event.list(filter),
        window.electronAPI.diary.list(filter),
      ])
      // 丢弃过期响应，防止旧请求覆盖新结果
      if (currentId !== requestIdRef.current) return
      const eventItems: TimelineEntry[] = eventResult.success
        ? eventResult.data.map((e) => ({ ...e, _type: 'event' as const, _sortDate: e.event_date }))
        : []
      const diaryItems: TimelineEntry[] = diaryResult.success
        ? diaryResult.data.map((d) => ({ ...d, _type: 'diary' as const, _sortDate: d.diary_date }))
        : []
      const merged = [...eventItems, ...diaryItems].sort((a, b) =>
        b._sortDate.localeCompare(a._sortDate)
      )
      setItems(merged)
    } catch (error) {
      console.error('加载数据失败:', error)
    } finally {
      if (currentId === requestIdRef.current) setLoading(false)
    }
  }, [debouncedKeyword, startDate, endDate])

  // 监听筛选条件变化自动加载
  useEffect(() => {
    loadData()
  }, [loadData])

  // 加载完成后滚动到高亮目标
  useEffect(() => {
    if (!loading && highlightId && highlightRef.current) {
      highlightRef.current.scrollIntoView({ behavior: 'smooth', block: 'center' })
    }
  }, [loading, highlightId])

  // 类型筛选（客户端过滤）
  const filteredItems = items.filter((item) => {
    if (typeFilter === 'all') return true
    return item._type === typeFilter
  })

  // 判断是否有任何筛选条件激活
  const hasAnyFilter =
    !!debouncedKeyword || !!startDate || !!endDate || typeFilter !== 'all'

  const handleClearFilters = () => {
    setKeyword('')
    setStartDate('')
    setEndDate('')
    setTypeFilter('all')
  }

  if (loading) {
    return (
      <div className="p-6 page-enter">
        <p className="text-gray-500">加载中...</p>
      </div>
    )
  }

  const tabs: { key: TypeFilter; label: string }[] = [
    { key: 'all', label: '全部' },
    { key: 'event', label: '事件' },
    { key: 'diary', label: '日记' },
  ]

  return (
      <div className="p-6 page-enter">
      <h1 className="text-2xl font-bold text-gray-800 mb-6">
        时间线（共 {filteredItems.length} 条）
      </h1>

      {/* 类型筛选 Tab */}
      <div className="flex gap-1 border-b border-gray-200 mb-4">
        {tabs.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setTypeFilter(tab.key)}
            className={`pb-2 px-4 -mb-px border-b-2 transition-colors ${
              typeFilter === tab.key
                ? 'border-primary-500 text-primary-600 font-medium'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* 搜索和日期筛选 */}
      <div className="flex flex-wrap items-center gap-3 mb-6">
        <input
          type="text"
          value={keyword}
          onChange={(e) => setKeyword(e.target.value)}
          placeholder="关键词搜索..."
          className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent flex-1 min-w-[200px]"
        />
        <input
          type="date"
          value={startDate}
          onChange={(e) => setStartDate(e.target.value)}
          className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
        />
        <input
          type="date"
          value={endDate}
          onChange={(e) => setEndDate(e.target.value)}
          className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
        />
        <button
          onClick={handleClearFilters}
          className="px-4 py-2 text-gray-600 border border-gray-300 rounded-md hover:bg-gray-50 transition-colors"
        >
          清除筛选
        </button>
      </div>

      {/* 时间线列表 */}
      {filteredItems.length === 0 ? (
        <EmptyState
          title={hasAnyFilter ? '没有符合筛选条件的记录' : '暂无时间线记录'}
          description={hasAnyFilter ? undefined : '添加事件或日记后可查看时间线'}
        />
      ) : (
        <div className="space-y-4">
          {filteredItems.map((item) => {
            // 判断是否为高亮目标
            const isHighlighted =
              !!highlightId &&
              item.id === highlightId &&
              item._type === highlightType
            return (
              <div
                key={item.id}
                ref={isHighlighted ? highlightRef : undefined}
                className={`rounded-xl transition-all ${
                  isHighlighted
                    ? 'ring-2 ring-primary-500 ring-offset-2 bg-primary-50'
                    : ''
                }`}
              >
                {item._type === 'event' ? (
                  <EventCard event={item} />
                ) : (
                  <DiaryCard diary={item} />
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
