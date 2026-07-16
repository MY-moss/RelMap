import { useState, useEffect } from 'react'
import {
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar,
  ResponsiveContainer,
} from 'recharts'
import type { Result, IntimacyPrediction } from '../../shared/types'
// IntimacyScore 暂定义在算法模块中；后续应迁入 shared/types 并改从此处导入
import type { IntimacyScore } from '../../main/ai/intimacy'

interface IntimacyTrendProps {
  personId: string
}

// ElectronAPI.ai 暂未声明 calculateIntimacy（需在 types.ts 中补充），
// 这里对 ai 接口做局部类型扩展，保证调用时的类型安全。
type AiApiWithIntimacy = typeof window.electronAPI.ai & {
  calculateIntimacy: (personId: string) => Promise<Result<IntimacyScore>>
}

// 亲密度等级配置（与 IntimacySlider 保持一致的颜色编码）
const LEVELS = [
  { max: 20, label: '疏远', color: '#EF4444' },
  { max: 40, label: '一般', color: '#F97316' },
  { max: 60, label: '普通', color: '#EAB308' },
  { max: 80, label: '好友', color: '#22C55E' },
  { max: 100, label: '密友', color: '#06B6D4' },
] as const

function getLevel(value: number) {
  return LEVELS.find((l) => value <= l.max) ?? LEVELS[LEVELS.length - 1]
}

export default function IntimacyTrend({ personId }: IntimacyTrendProps) {
  const [score, setScore] = useState<IntimacyScore | null>(null)
  const [prediction, setPrediction] = useState<IntimacyPrediction | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false

    const load = async () => {
      setLoading(true)
      setError(null)
      try {
        const ai = window.electronAPI.ai as AiApiWithIntimacy
        const [scoreResult, predictionResult] = await Promise.all([
          ai.calculateIntimacy(personId),
          window.electronAPI.intimacy_prediction.predict(personId),
        ])
        if (cancelled) return
        if (scoreResult.success) {
          setScore(scoreResult.data)
        } else {
          setError(scoreResult.error)
        }
        if (predictionResult.success) {
          setPrediction(predictionResult.data)
        }
      } catch (e) {
        if (!cancelled) setError((e as Error).message)
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    load()
    return () => {
      cancelled = true
    }
  }, [personId])

  if (loading) {
    return <div className="p-6 text-center text-gray-500">计算中...</div>
  }

  if (error) {
    return <div className="p-6 text-center text-red-500">错误：{error}</div>
  }

  if (!score) {
    return <div className="p-6 text-center text-gray-500">暂无亲密度数据</div>
  }

  const level = getLevel(score.total)

  const radarData = [
    { dimension: '交互频率', score: score.dimensions.frequency, fullMark: 100 },
    { dimension: '最近联系', score: score.dimensions.recency, fullMark: 100 },
    { dimension: '关系深度', score: score.dimensions.depth, fullMark: 100 },
    { dimension: '手动设置', score: score.dimensions.manual, fullMark: 100 },
  ]

  const detailItems = [
    { label: '交互次数', value: `${score.details.interaction_count} 次` },
    { label: '最近联系', value: score.details.last_interaction_date ?? '无记录' },
    { label: '关联事件', value: `${score.details.event_count} 个` },
    { label: '关联日记', value: `${score.details.diary_count} 篇` },
    { label: '手动亲密度', value: `${score.details.manual_intimacy}` },
  ]

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
      <h3 className="text-base font-semibold text-gray-800 mb-4">亲密度评分</h3>

      {/* 综合评分 + 雷达图 */}
      <div className="flex flex-col items-center">
        <div className="flex items-baseline gap-2 mb-1">
          <span className="text-5xl font-bold" style={{ color: level.color }}>
            {score.total}
          </span>
          <span
            className="text-sm font-medium px-2 py-0.5 rounded"
            style={{ backgroundColor: `${level.color}1A`, color: level.color }}
          >
            {level.label}
          </span>
        </div>
        <p className="text-xs text-gray-400 mb-4">综合评分（满分100）</p>

        <div className="w-full" style={{ height: 300 }}>
          <ResponsiveContainer width="100%" height="100%">
            <RadarChart data={radarData} outerRadius="75%">
              <PolarGrid />
              <PolarAngleAxis dataKey="dimension" tick={{ fill: '#6B7280', fontSize: 13 }} />
              <PolarRadiusAxis domain={[0, 100]} tick={{ fill: '#9CA3AF', fontSize: 11 }} />
              <Radar
                name="评分"
                dataKey="score"
                stroke="#FF9F43"
                fill="#FF9F43"
                fillOpacity={0.4}
              />
            </RadarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* 详细数据 */}
      <div className="mt-6 grid grid-cols-2 sm:grid-cols-3 gap-4">
        {detailItems.map((item) => (
          <div key={item.label} className="bg-gray-50 rounded-lg px-4 py-3 text-center">
            <p className="text-xs text-gray-500">{item.label}</p>
            <p className="text-sm font-medium text-gray-800 mt-1">{item.value}</p>
          </div>
        ))}
      </div>

      {prediction && (
        <div className="mt-6 pt-6 border-t border-gray-100">
          <h4 className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-1">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-4 h-4 text-primary-500">
              <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 3v11.25A2.25 2.25 0 006 16.5h2.25M3.75 3h-1.5m1.5 0h16.5m0 0h1.5m-1.5 0v11.25A2.25 2.25 0 0118 16.5h-2.25m-7.5 0h7.5m-7.5 0l-1 3m8.5-3l1 3m0 0l.5 1.5m-.5-1.5h-9.5m0 0l-.5 1.5" />
            </svg>
            亲密度预测
          </h4>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="bg-gray-50 rounded-lg px-3 py-2.5 text-center">
              <p className="text-xs text-gray-500">当前</p>
              <p className="text-sm font-bold text-gray-800">{prediction.currentScore}</p>
            </div>
            <div className="bg-blue-50 rounded-lg px-3 py-2.5 text-center">
              <p className="text-xs text-blue-500">30天后</p>
              <p className="text-sm font-bold text-blue-700">{prediction.predictedScore30d}</p>
            </div>
            <div className="bg-purple-50 rounded-lg px-3 py-2.5 text-center">
              <p className="text-xs text-purple-500">90天后</p>
              <p className="text-sm font-bold text-purple-700">{prediction.predictedScore90d}</p>
            </div>
            <div className="bg-gray-50 rounded-lg px-3 py-2.5 text-center">
              <p className="text-xs text-gray-500">趋势</p>
              <div className="flex items-center justify-center gap-1 mt-0.5">
                <span className={`text-lg font-bold ${
                  prediction.trend === 'up' ? 'text-green-600' : prediction.trend === 'down' ? 'text-red-500' : 'text-gray-500'
                }`}>
                  {prediction.trend === 'up' ? '\u2191' : prediction.trend === 'down' ? '\u2193' : '\u2192'}
                </span>
                <span className="text-xs text-gray-500">{prediction.confidence}%</span>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
