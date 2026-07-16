import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import type { BridgePerson } from '../../shared/types'

export default function BridgeDetector() {
  const navigate = useNavigate()
  const [bridges, setBridges] = useState<BridgePerson[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    const load = async () => {
      setLoading(true)
      setError(null)
      try {
        const result = await window.electronAPI.bridge.detect(10)
        if (cancelled) return
        if (result.success) {
          setBridges(result.data)
        } else {
          setError(result.error)
        }
      } catch (e) {
        if (!cancelled) setError((e as Error).message)
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    load()
    return () => { cancelled = true }
  }, [])

  if (loading) {
    return (
      <div className="p-4 text-center text-gray-500 text-sm">
        分析中...
      </div>
    )
  }

  if (error) {
    return (
      <div className="p-4 text-center text-red-500 text-sm">
        {error}
      </div>
    )
  }

  if (bridges.length === 0) {
    return (
      <div className="p-4 text-center text-gray-400 text-sm">
        暂无桥接人数据，请先添加关系
      </div>
    )
  }

  const maxScore = bridges.length > 0 ? bridges[0].betweennessScore : 1

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
      <h3 className="text-sm font-semibold text-gray-800 mb-3 flex items-center gap-1">
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-4 h-4 text-primary-500">
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
        桥接人识别
      </h3>
      <div className="space-y-2">
        {bridges.map((bridge, idx) => (
          <div
            key={bridge.personId}
            className="flex items-center gap-3 p-2 rounded-lg hover:bg-gray-50 cursor-pointer transition-colors"
            onClick={() => navigate(`/persons/${bridge.personId}`)}
          >
            <div className="w-8 h-8 rounded-full bg-primary-100 text-primary-600 flex items-center justify-center text-xs font-bold flex-shrink-0">
              {idx + 1}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-gray-800 truncate">{bridge.personName}</p>
              <p className="text-xs text-gray-500">{bridge.connects} 个直接连接</p>
            </div>
            <div className="text-right flex-shrink-0">
              <div className="text-xs font-semibold text-primary-600">
                {Math.round(bridge.betweennessScore * 100) / 100}
              </div>
              <div className="w-16 h-1.5 bg-gray-100 rounded-full mt-1 overflow-hidden">
                <div
                  className="h-full bg-primary-500 rounded-full"
                  style={{ width: `${Math.min((bridge.betweennessScore / maxScore) * 100, 100)}%` }}
                />
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
