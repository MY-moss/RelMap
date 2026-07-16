import { useState, useEffect } from 'react'
import {
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
} from 'recharts'
import type { PersonalityProfile } from '../../shared/types'

interface PersonalityProfileProps {
  personId: string
}

const COLORS = ['#6366f1', '#f97316', '#22c55e', '#ef4444', '#06b6d4', '#eab308']

export default function PersonalityProfileView({ personId }: PersonalityProfileProps) {
  const [profile, setProfile] = useState<PersonalityProfile | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    const load = async () => {
      setLoading(true)
      setError(null)
      try {
        const result = await window.electronAPI.personality.buildProfile(personId)
        if (cancelled) return
        if (result.success) {
          setProfile(result.data)
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
  }, [personId])

  if (loading) {
    return <div className="p-6 text-center text-gray-500">分析中...</div>
  }

  if (error) {
    return <div className="p-6 text-center text-red-500">错误：{error}</div>
  }

  if (!profile) {
    return <div className="p-6 text-center text-gray-500">暂无数据</div>
  }

  const radarData = [
    { trait: '交互活跃度', score: Math.min(profile.totalInteractions * 5, 100) },
    { trait: '关系深度', score: profile.relationshipDepth },
    { trait: '情绪正向度', score: profile.emotionalTone > 0 ? Math.min(profile.emotionalTone * 10, 100) : 50 },
  ]

  const styleData = Object.entries(profile.interactionStyle)
    .filter(([, count]) => count > 0)
    .map(([type, count]) => ({ name: type, value: count }))

  const typeLabels: Record<string, string> = {
    call: '通话',
    meet: '见面',
    message: '消息',
    social: '社交',
    other: '其他',
  }

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
      <h3 className="text-base font-semibold text-gray-800 mb-4">性格分析画像</h3>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div>
          <h4 className="text-sm font-medium text-gray-600 mb-2">综合特质</h4>
          <div style={{ height: 250 }}>
            <ResponsiveContainer width="100%" height="100%">
              <RadarChart data={radarData}>
                <PolarGrid />
                <PolarAngleAxis dataKey="trait" tick={{ fill: '#6B7280', fontSize: 12 }} />
                <PolarRadiusAxis domain={[0, 100]} tick={{ fill: '#9CA3AF', fontSize: 10 }} />
                <Radar name="评分" dataKey="score" stroke="#6366f1" fill="#6366f1" fillOpacity={0.4} />
              </RadarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div>
          <h4 className="text-sm font-medium text-gray-600 mb-2">交互方式分布</h4>
          {styleData.length > 0 ? (
            <div style={{ height: 250 }}>
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={styleData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={80} label={({ name }: { name?: string }) => (name ? typeLabels[name] || name : '')}>
                    {styleData.map((_, idx) => (
                      <Cell key={idx} fill={COLORS[idx % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(value) => [`${value} 次`, '交互']} />
                </PieChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <p className="text-sm text-gray-400 text-center py-8">暂无交互记录</p>
          )}
        </div>
      </div>

      <div className="mt-6 grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="bg-gray-50 rounded-lg px-4 py-3 text-center">
          <p className="text-xs text-gray-500">主要目的</p>
          <p className="text-sm font-medium text-gray-800 mt-1 truncate">{profile.dominantPurpose}</p>
        </div>
        <div className="bg-gray-50 rounded-lg px-4 py-3 text-center">
          <p className="text-xs text-gray-500">情绪基调</p>
          <p className="text-sm font-medium text-gray-800 mt-1">{profile.emotionalTone > 6 ? '积极' : profile.emotionalTone > 4 ? '中性' : '偏消极'}</p>
        </div>
        <div className="bg-gray-50 rounded-lg px-4 py-3 text-center">
          <p className="text-xs text-gray-500">关系深度</p>
          <p className="text-sm font-medium text-gray-800 mt-1">{profile.relationshipDepth}/100</p>
        </div>
        <div className="bg-gray-50 rounded-lg px-4 py-3 text-center">
          <p className="text-xs text-gray-500">总交互次数</p>
          <p className="text-sm font-medium text-gray-800 mt-1">{profile.totalInteractions}</p>
        </div>
      </div>

      {profile.purposeDistribution.length > 0 && (
        <div className="mt-6">
          <h4 className="text-sm font-medium text-gray-600 mb-2">交互目的分布</h4>
          <div style={{ height: 200 }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={profile.purposeDistribution.slice(0, 10)}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="purpose" tick={{ fill: '#6B7280', fontSize: 11 }} />
                <YAxis tick={{ fill: '#9CA3AF', fontSize: 11 }} />
                <Tooltip />
                <Bar dataKey="count" fill="#6366f1" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}
    </div>
  )
}
