import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import type { PathResult } from '../../shared/types'

function getIntimacyColor(intimacy: number): string {
  if (intimacy <= 20) return '#d1d5db'
  if (intimacy <= 40) return '#60a5fa'
  if (intimacy <= 60) return '#34d399'
  if (intimacy <= 80) return '#fb923c'
  return '#f87171'
}

interface PathFinderProps {
  persons: { id: string; name: string }[]
  onHighlightPath?: (personIds: string[]) => void
}

export default function PathFinder({ persons, onHighlightPath }: PathFinderProps) {
  const navigate = useNavigate()
  const [aId, setAId] = useState('')
  const [bId, setBId] = useState('')
  const [result, setResult] = useState<PathResult | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [selectedPathIdx, setSelectedPathIdx] = useState(0)
  const reqRef = useRef(0)

  useEffect(() => {
    setResult(null)
    setSelectedPathIdx(0)
  }, [aId, bId])

  const handleSearch = async () => {
    if (!aId || !bId) return
    setLoading(true)
    setError(null)
    setResult(null)
    const id = ++reqRef.current
    try {
      const res = await window.electronAPI.pathfinder.find(aId, bId)
      if (reqRef.current !== id) return
      if (res.success) {
        setResult(res.data)
        if (res.data.found && onHighlightPath) {
          const ids = new Set<string>()
          for (const path of res.data.paths) {
            for (const step of path) ids.add(step.personId)
          }
          onHighlightPath(Array.from(ids))
        }
      } else {
        setError(res.error)
      }
    } catch (e) {
      setError((e as Error).message)
    }
    setLoading(false)
  }

  const currentPath = result?.found ? result.paths[selectedPathIdx] ?? null : null

  return (
    <div className="bg-white rounded-xl border border-gray-200 shadow-sm">
      <div className="px-4 py-3 border-b border-gray-100">
        <h3 className="text-sm font-semibold text-gray-800">关系路径查找</h3>
        <p className="text-xs text-gray-500 mt-0.5">查询两人之间的社交关系链</p>
      </div>

      <div className="p-4 space-y-3">
        <div>
          <label className="text-xs font-medium text-gray-600 mb-1 block">起点</label>
          <select
            value={aId}
            onChange={(e) => setAId(e.target.value)}
            className="w-full px-2 py-1.5 text-sm border border-gray-200 rounded-md focus:outline-none focus:border-primary-400 bg-white"
          >
            <option value="">选择联系人...</option>
            {persons.map((p) => (
              <option key={p.id} value={p.id}>{p.name}</option>
            ))}
          </select>
        </div>

        <div>
          <label className="text-xs font-medium text-gray-600 mb-1 block">终点</label>
          <select
            value={bId}
            onChange={(e) => setBId(e.target.value)}
            className="w-full px-2 py-1.5 text-sm border border-gray-200 rounded-md focus:outline-none focus:border-primary-400 bg-white"
          >
            <option value="">选择联系人...</option>
            {persons.map((p) => (
              <option key={p.id} value={p.id}>{p.name}</option>
            ))}
          </select>
        </div>

        <button
          onClick={handleSearch}
          disabled={!aId || !bId || loading}
          className="w-full px-3 py-2 bg-primary-500 hover:bg-primary-600 disabled:bg-gray-300 disabled:cursor-not-allowed text-white text-sm rounded-md transition-colors flex items-center justify-center gap-1"
        >
          {loading ? (
            <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
            </svg>
          ) : (
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-4 h-4">
              <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
            </svg>
          )}
          {loading ? '查找中...' : '查找路径'}
        </button>

        {error && (
          <div className="p-2 bg-red-50 border border-red-200 rounded text-xs text-red-600">
            {error}
          </div>
        )}

        {!loading && result && !result.found && (
          <div className="p-4 text-center text-sm text-gray-500">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="w-8 h-8 mx-auto mb-2 text-gray-300">
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 10.5a3 3 0 11-6 0 3 3 0 016 0z" />
              <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 1115 0z" />
            </svg>
            <p>未找到连接路径</p>
            <p className="text-xs text-gray-400 mt-1">两人之间没有关系链</p>
          </div>
        )}

        {currentPath && (
          <div className="border-t border-gray-100 pt-3">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs text-gray-500">
                 找到 {result?.totalPaths ?? 0} 条路径
              </span>
              {(result?.totalPaths ?? 0) > 1 && (
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => setSelectedPathIdx(Math.max(0, selectedPathIdx - 1))}
                    disabled={selectedPathIdx === 0}
                    className="p-1 text-gray-400 hover:text-gray-600 disabled:opacity-30 disabled:cursor-not-allowed"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-3.5 h-3.5">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
                    </svg>
                  </button>
                  <span className="text-xs font-medium text-gray-600">
                    {selectedPathIdx + 1} / {result?.totalPaths ?? 0}
                  </span>
                  <button
                    onClick={() => setSelectedPathIdx(Math.min((result?.totalPaths ?? 1) - 1, selectedPathIdx + 1))}
                    disabled={selectedPathIdx >= (result?.totalPaths ?? 1) - 1}
                    className="p-1 text-gray-400 hover:text-gray-600 disabled:opacity-30 disabled:cursor-not-allowed"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-3.5 h-3.5">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                    </svg>
                  </button>
                </div>
              )}
            </div>

            <div className="space-y-1.5">
              {currentPath.map((step, i) => (
                <div key={step.personId}>
                  <div
                    className="flex items-center gap-2 px-2 py-1.5 rounded-md hover:bg-gray-50 cursor-pointer transition-colors"
                    onClick={() => navigate(`/persons/${step.personId}`)}
                  >
                    <div className="w-6 h-6 rounded-full bg-primary-100 text-primary-600 flex items-center justify-center text-[10px] font-bold flex-shrink-0">
                      {step.personName.charAt(0).toUpperCase()}
                    </div>
                    <span className="text-xs text-gray-700 truncate flex-1">{step.personName}</span>
                    {step.relationIntimacy !== undefined && step.relationIntimacy > 0 && (
                      <span
                        className="w-2 h-2 rounded-full flex-shrink-0"
                        style={{ backgroundColor: getIntimacyColor(step.relationIntimacy) }}
                        title={`亲密度: ${step.relationIntimacy}`}
                      />
                    )}
                  </div>
                  {i < currentPath.length - 1 && (
                    <div className="flex items-center gap-2 ml-4 pl-3 py-0.5">
                      <div className="w-px h-4 bg-gray-200" />
                      <span className="text-[10px] text-gray-400 italic">
                        {currentPath[i + 1].relationLabel || `亲密度 ${currentPath[i + 1].relationIntimacy || '?'}`}
                      </span>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
