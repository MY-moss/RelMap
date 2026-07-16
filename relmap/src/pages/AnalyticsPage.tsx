import { useState } from 'react'
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend,
} from 'recharts'
import { useContactGrowth, useInteractionHeatmap, useActivityDistribution, useTopRelationships } from '../hooks'

const ACTIVITY_COLORS: Record<string, string> = {
  call: '#60a5fa',
  meet: '#34d399',
  message: '#fbbf24',
  social: '#f87171',
  other: '#a78bfa',
}

const ACTIVITY_LABELS: Record<string, string> = {
  call: '通话',
  meet: '见面',
  message: '消息',
  social: '社交',
  other: '其他',
}

export default function AnalyticsPage() {
  const [growthMonths, setGrowthMonths] = useState(12)
  const [heatmapMonths, setHeatmapMonths] = useState(3)
  const [topLimit, setTopLimit] = useState(10)

  const { data: growth = [], isLoading: growthLoading } = useContactGrowth(growthMonths)
  const { data: heatmap = [], isLoading: heatmapLoading } = useInteractionHeatmap(heatmapMonths)
  const { data: activityDist = [], isLoading: activityLoading } = useActivityDistribution()
  const { data: topRelationships = [], isLoading: topLoading } = useTopRelationships(topLimit)

  const handleExportJSON = async () => {
    const data = {
      contactGrowth: growth,
      interactionHeatmap: heatmap,
      activityDistribution: activityDist,
      topRelationships,
      exportedAt: new Date().toISOString(),
    }
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `relmap-analytics-${new Date().toISOString().slice(0, 10)}.json`
    a.click()
    URL.revokeObjectURL(url)
  }

  const heatmapData = (() => {
    if (heatmapLoading || heatmap.length === 0) return []
    const map = new Map<string, number>()
    for (const item of heatmap) {
      map.set(item.date, item.count)
    }
    const sorted = Array.from(map.entries()).sort((a, b) => a[0].localeCompare(b[0]))
    const maxCount = Math.max(...sorted.map(([, c]) => c), 1)
    return sorted.map(([date, count]) => ({
      date,
      count,
      intensity: count / maxCount,
    }))
  })()

  return (
    <div className="p-6 page-enter">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-800 dark:text-gray-100">数据分析</h1>
        <button
          onClick={handleExportJSON}
          className="px-4 py-2 bg-primary-500 hover:bg-primary-600 text-white rounded-lg text-sm transition-colors"
        >
          导出分析数据 (JSON)
        </button>
      </div>

      <div className="grid grid-cols-2 gap-6">
        {/* 联系人增长 */}
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 p-4 col-span-2 lg:col-span-1">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-gray-800 dark:text-gray-100">联系人增长趋势</h2>
            <select
              value={growthMonths}
              onChange={(e) => setGrowthMonths(Number(e.target.value))}
              className="text-sm border border-gray-200 dark:border-gray-600 rounded px-2 py-1 bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-200"
            >
              <option value={6}>近6个月</option>
              <option value={12}>近12个月</option>
              <option value={24}>近24个月</option>
            </select>
          </div>
          {growthLoading ? (
            <div className="flex items-center justify-center h-64 text-gray-400">加载中...</div>
          ) : growth.length === 0 ? (
            <div className="flex items-center justify-center h-64 text-gray-400">暂无数据</div>
          ) : (
            <ResponsiveContainer width="100%" height={280}>
              <LineChart data={growth}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                <XAxis dataKey="month" tick={{ fontSize: 12 }} stroke="#9ca3af" />
                <YAxis tick={{ fontSize: 12 }} stroke="#9ca3af" allowDecimals={false} />
                <Tooltip />
                <Line type="monotone" dataKey="count" stroke="#60a5fa" strokeWidth={2} dot={{ r: 3 }} />
              </LineChart>
            </ResponsiveContainer>
          )}
        </div>

        {/* 交互热度图 */}
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 p-4 col-span-2 lg:col-span-1">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-gray-800 dark:text-gray-100">交互热度图</h2>
            <select
              value={heatmapMonths}
              onChange={(e) => setHeatmapMonths(Number(e.target.value))}
              className="text-sm border border-gray-200 dark:border-gray-600 rounded px-2 py-1 bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-200"
            >
              <option value={1}>近1个月</option>
              <option value={3}>近3个月</option>
              <option value={6}>近6个月</option>
            </select>
          </div>
          {heatmapLoading ? (
            <div className="flex items-center justify-center h-64 text-gray-400">加载中...</div>
          ) : heatmapData.length === 0 ? (
            <div className="flex items-center justify-center h-64 text-gray-400">暂无数据</div>
          ) : (
            <div className="h-64 overflow-y-auto">
              <div className="flex flex-wrap gap-1">
                {heatmapData.map((d) => (
                  <div
                    key={d.date}
                    className="w-8 h-8 rounded flex items-center justify-center text-[10px]"
                    style={{
                      backgroundColor: d.count > 0
                        ? `rgba(96, 165, 250, ${0.15 + d.intensity * 0.85})`
                        : '#f3f4f6',
                      color: d.intensity > 0.5 ? '#fff' : '#6b7280',
                    }}
                    title={`${d.date}: ${d.count} 次交互`}
                  >
                    {new Date(d.date).getDate()}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* 交互类型分布 */}
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 p-4 col-span-2 lg:col-span-1">
          <h2 className="text-lg font-semibold text-gray-800 dark:text-gray-100 mb-4">交互类型分布</h2>
          {activityLoading ? (
            <div className="flex items-center justify-center h-64 text-gray-400">加载中...</div>
          ) : activityDist.length === 0 ? (
            <div className="flex items-center justify-center h-64 text-gray-400">暂无数据</div>
          ) : (
            <ResponsiveContainer width="100%" height={280}>
              <PieChart>
                <Pie
                  data={activityDist.map((d) => ({
                    name: ACTIVITY_LABELS[d.type] ?? d.type,
                    value: d.count,
                    color: ACTIVITY_COLORS[d.type] ?? '#9ca3af',
                  }))}
                  dataKey="value"
                  nameKey="name"
                  cx="50%"
                  cy="50%"
                  outerRadius={80}
                  label={(entry) => (entry.value > 0 ? entry.value : '')}
                >
                  {activityDist.map((d, idx) => (
                    <Cell key={`cell-${idx}`} fill={ACTIVITY_COLORS[d.type] ?? '#9ca3af'} />
                  ))}
                </Pie>
                <Tooltip />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          )}
        </div>

        {/* 最强关系排行 */}
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 p-4 col-span-2 lg:col-span-1">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-gray-800 dark:text-gray-100">最强关系排行</h2>
            <select
              value={topLimit}
              onChange={(e) => setTopLimit(Number(e.target.value))}
              className="text-sm border border-gray-200 dark:border-gray-600 rounded px-2 py-1 bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-200"
            >
              <option value={5}>Top 5</option>
              <option value={10}>Top 10</option>
              <option value={20}>Top 20</option>
            </select>
          </div>
          {topLoading ? (
            <div className="flex items-center justify-center h-64 text-gray-400">加载中...</div>
          ) : topRelationships.length === 0 ? (
            <div className="flex items-center justify-center h-64 text-gray-400">暂无数据</div>
          ) : (
            <div className="space-y-2 max-h-64 overflow-y-auto">
              {topRelationships.map((rel, idx) => (
                <div
                  key={rel.id}
                  className="flex items-center gap-3 p-2 rounded-lg border border-gray-100 dark:border-gray-700"
                >
                  <span className="w-6 h-6 rounded-full bg-primary-50 dark:bg-primary-900/30 text-primary-600 dark:text-primary-400 flex items-center justify-center text-xs font-bold">
                    {idx + 1}
                  </span>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium text-gray-800 dark:text-gray-100 truncate">
                      {rel.person_name} ↔ {rel.related_person_name}
                    </div>
                    {rel.relation_label && (
                      <div className="text-xs text-gray-400 truncate">{rel.relation_label}</div>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-20 h-2 bg-gray-100 dark:bg-gray-700 rounded-full overflow-hidden">
                      <div
                        className="h-full rounded-full transition-all"
                        style={{
                          width: `${rel.intimacy}%`,
                          backgroundColor: rel.intimacy >= 80 ? '#34d399' : rel.intimacy >= 60 ? '#60a5fa' : rel.intimacy >= 40 ? '#fbbf24' : '#f87171',
                        }}
                      />
                    </div>
                    <span className="text-xs font-mono text-gray-500 w-8 text-right">{rel.intimacy}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
