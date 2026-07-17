import { useState, useCallback, useRef, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import type { ChatSearchResult } from '../../shared/types'

export default function ChatSearchBar() {
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<ChatSearchResult[]>([])
  const [searching, setSearching] = useState(false)
  const [showResults, setShowResults] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)
  const debounceRef = useRef<ReturnType<typeof setTimeout>>()

  const doSearch = useCallback(async (q: string) => {
    if (q.length < 1) { setResults([]); return }
    setSearching(true)
    const res = await window.electronAPI.aiChat.searchHistory(q)
    if (res.success && res.data) {
      setResults(res.data)
    }
    setSearching(false)
  }, [])

  const handleInput = useCallback((value: string) => {
    setQuery(value)
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => doSearch(value), 300)
  }, [doSearch])

  useEffect(() => {
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current) }
  }, [])

  return (
    <div className="relative">
      <div className="relative">
        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={e => handleInput(e.target.value)}
          onFocus={() => setShowResults(true)}
          placeholder="搜索聊天记录..."
          className="w-full pl-9 pr-3 py-2 text-sm bg-gray-100 dark:bg-gray-700 rounded-lg border-0 focus:ring-2 focus:ring-primary-300 outline-none text-gray-800 dark:text-gray-100 placeholder-gray-400"
        />
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">
          <path fillRule="evenodd" d="M9 3.5a5.5 5.5 0 100 11 5.5 5.5 0 000-11zM2 9a7 7 0 1112.452 4.391l3.328 3.329a.75.75 0 11-1.06 1.06l-3.329-3.328A7 7 0 012 9z" clipRule="evenodd" />
        </svg>
        {searching && <div className="absolute right-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 border-2 border-primary-500 border-t-transparent rounded-full animate-spin" />}
      </div>

      {showResults && query.length > 0 && (
        <div className="absolute top-full left-0 right-0 mt-1 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl shadow-lg z-50 max-h-72 overflow-y-auto">
          {results.length === 0 && !searching && (
            <div className="p-4 text-sm text-gray-400 text-center">未找到匹配结果</div>
          )}
          {results.map(r => (
            <SearchResultItem key={r.sessionId} result={r} query={query} onClose={() => setShowResults(false)} />
          ))}
        </div>
      )}
    </div>
  )
}

function SearchResultItem({ result, query, onClose }: { result: ChatSearchResult; query: string; onClose: () => void }) {
  const navigate = useNavigate()

  const highlight = (text: string) => {
    if (!query) return text
    const parts = text.split(new RegExp(`(${query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi'))
    return parts.map((part, i) =>
      part.toLowerCase() === query.toLowerCase()
        ? <span key={i} className="bg-yellow-200 dark:bg-yellow-700 text-gray-900 dark:text-gray-100 rounded px-0.5">{part}</span>
        : part
    )
  }

  return (
    <div className="p-3 border-b border-gray-100 dark:border-gray-700 last:border-0 hover:bg-gray-50 dark:hover:bg-gray-700/50 cursor-pointer"
      onClick={() => { navigate(`/ai?session=${result.sessionId}`); onClose() }}>
      <div className="flex items-center gap-2 mb-1">
        <span className="text-sm font-medium text-gray-800 dark:text-gray-100">{result.sessionTitle}</span>
        <span className="text-xs text-gray-400">{result.matchCount} 处匹配</span>
      </div>
      <div className="space-y-1">
        {result.matches.slice(0, 2).map((m, i) => (
          <div key={i} className="text-xs text-gray-500 dark:text-gray-400 truncate">
            <span className={`inline-block px-1 rounded mr-1 ${m.role === 'user' ? 'bg-blue-100 text-blue-600' : 'bg-green-100 text-green-600'}`}>
              {m.role === 'user' ? '我' : 'AI'}
            </span>
            {highlight(m.content.slice(0, 100))}
          </div>
        ))}
      </div>
    </div>
  )
}
