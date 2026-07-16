import { useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import { useNavigate } from 'react-router-dom'
import { format } from 'date-fns'
import { PieChart, Pie, Cell, Legend, Tooltip, ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, LineChart, Line } from 'recharts'
import type { EventItem } from '../shared/types'
import LostContactAlert from '../components/reminders/LostContactAlert'
import ReminderList from '../components/reminders/ReminderList'
import { usePersonList, useEventList, useDiaryList, useIntimacyDistribution, useGraphData, useMainPerson, usePersonRelations } from '../hooks'
import { useLifecycleDistribution, useMonthlyInteractionTrend } from '../hooks'

type Activity =
  | { type: 'event'; id: string; title: string; date: string; personIds?: string[] }
  | { type: 'diary'; id: string; title: string; date: string }

const INTIMACY_BUCKETS = [
  { name: '疏远 (0-20)', min: 0, max: 20, color: 'var(--color-intimacy-distant)' },
  { name: '普通 (21-40)', min: 21, max: 40, color: 'var(--color-intimacy-normal)' },
  { name: '朋友 (41-60)', min: 41, max: 60, color: 'var(--color-intimacy-friend)' },
  { name: '好朋友 (61-80)', min: 61, max: 80, color: 'var(--color-intimacy-close)' },
  { name: '亲密 (81-100)', min: 81, max: 100, color: 'var(--color-intimacy-intimate)' },
]

const LIFECYCLE_LABELS: Record<string, string> = {
  new: '新认识',
  active: '活跃',
  maintain: '维护',
  dormant: '休眠',
  lost: '断联',
  archived: '已归档',
}

const LIFECYCLE_COLORS: Record<string, string> = {
  new: 'var(--color-lifecycle-new)',
  active: 'var(--color-lifecycle-active)',
  maintain: 'var(--color-lifecycle-maintain)',
  dormant: 'var(--color-lifecycle-dormant)',
  lost: 'var(--color-lifecycle-lost)',
  archived: 'var(--color-lifecycle-archived)',
}

export default function HomePage() {
  const { t } = useTranslation()
  const navigate = useNavigate()

  const { data: persons = [], isLoading: loading } = usePersonList({ limit: 20, sort_by: 'created_at', sort_order: 'desc' })
  const { data: events = [] } = useEventList()
  const { data: diaries = [] } = useDiaryList()
  const { data: intimacyDist = [] } = useIntimacyDistribution()
  const { data: lifecycleDist = [] } = useLifecycleDistribution()
  const { data: monthlyTrend = [] } = useMonthlyInteractionTrend(12)
  // 限制加载前50条关系（按亲密度降序），避免大数据量时加载全部图谱影响性能
  const { data: graphData } = useGraphData(0, 50)
  const { data: mainPerson } = useMainPerson()
  const { data: mainRelations = [] } = usePersonRelations(mainPerson?.id ?? '', !!mainPerson)

  // 从有限的图谱数据计算网络统计指标，避免后端全量加载所有关系
  const networkStats = useMemo(() => {
    if (!graphData || graphData.edges.length === 0) {
      return { totalNodes: 0, totalEdges: 0, connectedComponents: 0, avgIntimacy: 0, density: 0 }
    }
    const totalNodes = graphData.nodes.length
    const totalEdges = graphData.edges.length
    const avgIntimacy = Math.round(
      (graphData.edges.reduce((sum, e) => sum + e.intimacy, 0) / totalEdges) * 10,
    ) / 10

    // 使用并查集计算连通分量（社交圈数量）
    const parent = new Map<string, string>()
    const find = (x: string): string => {
      if (!parent.has(x)) parent.set(x, x)
      if (parent.get(x) !== x) parent.set(x, find(parent.get(x)!))
      return parent.get(x)!
    }
    for (const edge of graphData.edges) {
      const ra = find(edge.source)
      const rb = find(edge.target)
      if (ra !== rb) parent.set(ra, rb)
    }
    const roots = new Set<string>()
    for (const node of graphData.nodes) {
      roots.add(find(node.id))
    }

    const density =
      totalNodes > 1
        ? Math.round((totalEdges * 2) / (totalNodes * (totalNodes - 1)) * 10000) / 10000
        : 0

    return { totalNodes, totalEdges, connectedComponents: roots.size, avgIntimacy, density }
  }, [graphData])

  const totalPersons = persons.length
  const favoritePersons = persons.filter((p) => p.is_favorite).length
  const totalEvents = events.length
  const totalDiaries = diaries.length

  const recentActivities: Activity[] = (() => {
    const eventItems: Activity[] = events.map((e) => ({
      type: 'event' as const,
      id: e.id,
      title: e.title,
      date: e.event_date,
      personIds: (e as EventItem & { person_ids?: string[] }).person_ids,
    }))
    const diaryItems: Activity[] = diaries.map((d) => ({
      type: 'diary' as const,
      id: d.id,
      title: d.title || d.content.slice(0, 20),
      date: d.diary_date,
    }))
    return [...eventItems, ...diaryItems]
      .sort((a, b) => b.date.localeCompare(a.date))
      .slice(0, 5)
  })()

  const distMap = new Map(intimacyDist.map(d => [d.bucket, d.count]))
  const intimacyData = INTIMACY_BUCKETS.map((bucket, idx) => ({
    name: bucket.name,
    value: distMap.get(idx) ?? 0,
    color: bucket.color,
  }))

  const lifecycleData = LIFECYCLE_LABELS
    ? Object.entries(LIFECYCLE_LABELS).map(([stage, label]) => {
        const found = lifecycleDist.find((d) => d.stage === stage)
        return {
          name: label,
          value: found?.count ?? 0,
          color: LIFECYCLE_COLORS[stage] ?? '#9ca3af',
        }
      })
    : []

  const healthScore = (() => {
    if (totalPersons === 0) return { score: 0, level: 'neutral' as const, color: '#9ca3af' }

    const lostCount = lifecycleDist.find((d) => d.stage === 'lost')?.count ?? 0
    const notLostRatioVal = totalPersons > 0 ? (totalPersons - lostCount) / totalPersons : 0

    const avgIntimacy = networkStats?.avgIntimacy ?? 0

    const recentMonthCount = monthlyTrend.length > 0
      ? monthlyTrend[monthlyTrend.length - 1].count
      : 0
    const frequencyScore = Math.min(recentMonthCount / totalPersons * 20, 100)

    const score = Math.round(
      notLostRatioVal * 40 + (avgIntimacy / 100) * 35 + (frequencyScore / 100) * 25,
    )

    let level: 'good' | 'fair' | 'poor' = 'poor'
    let color = 'var(--color-lifecycle-lost)'
    if (score >= 70) { level = 'good'; color = 'var(--color-lifecycle-active)' }
    else if (score >= 40) { level = 'fair'; color = 'var(--color-lifecycle-maintain)' }

    return { score, level, color }
  })()

  const handleActivityClick = (activity: Activity) => {
    if (activity.type === 'event' && activity.personIds && activity.personIds.length > 0) {
      navigate(`/persons/${activity.personIds[0]}`)
    }
  }

  if (loading) {
    return (
      <div className="p-6 page-enter">
        <p className="text-gray-500">{t('common.loading')}</p>
      </div>
    )
  }

  if (totalPersons === 0) {
    return (
      <div className="p-6 page-enter">
        <h1 className="text-2xl font-bold text-gray-800 dark:text-gray-100">{t('home.title')}</h1>
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <div className="w-16 h-16 rounded-full bg-primary-50 flex items-center justify-center text-primary-500 mb-4">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="w-8 h-8">
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 19.128a9.38 9.38 0 002.625.372 9.337 9.337 0 004.121-.952 4.125 4.125 0 00-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 018.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0111.964-3.07M12 6.375a3.375 3.375 0 11-6.75 0 3.375 3.375 0 016.75 0zm8.25 2.25a2.625 2.625 0 11-5.25 0 2.625 2.625 0 015.25 0z" />
            </svg>
          </div>
          <p className="text-gray-600 text-lg mb-1">{t('home.welcome')}</p>
          <p className="text-gray-500 text-sm mb-6">{t('home.welcome_hint')}</p>
          <button
            onClick={() => navigate('/persons')}
            className="px-5 py-2 bg-primary-500 hover:bg-primary-600 text-white rounded-lg transition-colors"
          >
            {t('home.go_add_contact')}
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="p-6 page-enter">
      <h1 className="text-2xl font-bold text-gray-800 dark:text-gray-100">{t('home.title')}</h1>

      {/* 社交健康评分 */}
      <div className="mt-6 bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 p-4">
        <div className="flex items-center gap-4">
          <div
            className="w-16 h-16 rounded-full flex items-center justify-center text-white text-2xl font-bold"
            style={{ backgroundColor: healthScore.color }}
          >
            {healthScore.score}
          </div>
          <div>
            <div className="text-lg font-semibold text-gray-800 dark:text-gray-100">{t('home.social_health')}</div>
            <div className="text-sm text-gray-500 dark:text-gray-400">
              {healthScore.level === 'good' ? t('home.health_good') :
               healthScore.level === 'fair' ? t('home.health_fair') :
               t('home.health_poor')}
            </div>
          </div>
          <div className="ml-auto flex gap-6 text-sm">
            <div className="text-center">
              <div className="text-xl font-bold text-gray-800 dark:text-gray-100">{networkStats?.totalNodes ?? 0}</div>
              <div className="text-gray-400">{t('home.contacts')}</div>
            </div>
            <div className="text-center">
              <div className="text-xl font-bold text-gray-800 dark:text-gray-100">{networkStats?.totalEdges ?? 0}</div>
              <div className="text-gray-400">{t('home.relations_count')}</div>
            </div>
            <div className="text-center">
              <div className="text-xl font-bold text-gray-800 dark:text-gray-100">{networkStats?.avgIntimacy ?? 0}</div>
              <div className="text-gray-400">{t('home.avg_intimacy')}</div>
            </div>
            <div className="text-center">
              <div className="text-xl font-bold text-gray-800 dark:text-gray-100">{networkStats?.connectedComponents ?? 0}</div>
              <div className="text-gray-400">{t('home.social_circles')}</div>
            </div>
          </div>
        </div>
      </div>

      {/* 主身份概览 */}
      {mainPerson && (
        <div className="mt-6 bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-amber-100 dark:border-amber-900/30 p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <span className="text-2xl">👤</span>
              <div>
                <span className="font-semibold text-gray-800 dark:text-gray-100">{mainPerson.name}</span>
                <span className="ml-2 text-xs bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full">{t('home.main_identity')}</span>
                {mainPerson.company && (
                  <span className="ml-2 text-sm text-gray-500">{mainPerson.company}</span>
                )}
              </div>
            </div>
            <button
              onClick={() => navigate(`/persons/${mainPerson.id}`)}
              className="text-sm text-primary-500 hover:text-primary-700"
            >
              {t('common.view_details')} →
            </button>
          </div>
          {mainRelations.length > 0 && (
            <div className="mt-3 flex flex-wrap gap-2">
              <span className="text-xs text-gray-400 mr-1 self-center">{t('home.my_relations')}</span>
              {mainRelations.slice(0, 8).map((rel) => (
                <span
                  key={rel.id}
                  onClick={() => navigate(`/persons/${rel.related_person_id}`)}
                  className="text-xs px-2 py-1 bg-amber-50 text-amber-700 rounded-full cursor-pointer hover:bg-amber-100 transition-colors"
                >
                  {rel.related_person_name}
                  {rel.relation_label && <span className="text-amber-400 ml-1">{rel.relation_label}</span>}
                </span>
              ))}
              {mainRelations.length > 8 && (
                <span className="text-xs text-gray-400 self-center">+{mainRelations.length - 8} {t('common.more')}</span>
              )}
            </div>
          )}
        </div>
      )}

      {/* 统计卡片区域 */}
      <div className="grid grid-cols-4 gap-4 mt-6">
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 p-4 flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg flex items-center justify-center bg-orange-50 dark:bg-orange-900/20">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="var(--color-primary-orange)" strokeWidth="2" className="w-6 h-6">
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 19.128a9.38 9.38 0 002.625.372 9.337 9.337 0 004.121-.952 4.125 4.125 0 00-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 018.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0111.964-3.07M12 6.375a3.375 3.375 0 11-6.75 0 3.375 3.375 0 016.75 0zm8.25 2.25a2.625 2.625 0 11-5.25 0 2.625 2.625 0 015.25 0z" />
            </svg>
          </div>
          <div>
            <div className="text-3xl font-bold text-orange-500">{totalPersons}</div>
            <div className="text-sm text-gray-500 dark:text-gray-400 mt-1">{t('home.contacts')}</div>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 p-4 flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg flex items-center justify-center bg-amber-50 dark:bg-amber-900/20">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="var(--color-primary-amber)" stroke="var(--color-primary-amber)" strokeWidth="2" className="w-6 h-6">
              <path strokeLinecap="round" strokeLinejoin="round" d="M11.48 3.499a.562.562 0 011.04 0l2.125 5.111a.563.563 0 00.475.345l5.518.442c.499.04.701.663.321.988l-4.204 3.602a.563.563 0 00-.182.557l1.285 5.385a.562.562 0 01-.84.61l-4.725-2.885a.563.563 0 00-.586 0L6.982 20.54a.562.562 0 01-.84-.61l1.285-5.386a.562.562 0 00-.182-.557l-4.204-3.602a.563.563 0 01.321-.988l5.518-.442a.563.563 0 00.475-.345L11.48 3.5z" />
            </svg>
          </div>
          <div>
            <div className="text-3xl font-bold text-amber-400">{favoritePersons}</div>
            <div className="text-sm text-gray-500 dark:text-gray-400 mt-1">{t('home.favorites')}</div>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 p-4 flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg flex items-center justify-center bg-green-50 dark:bg-green-900/20">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="#34d399" strokeWidth="2" className="w-6 h-6">
              <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75m-18 0v-7.5A2.25 2.25 0 015.25 9h13.5A2.25 2.25 0 0121 11.25v7.5" />
            </svg>
          </div>
          <div>
            <div className="text-3xl font-bold text-green-400">{totalEvents}</div>
            <div className="text-sm text-gray-500 dark:text-gray-400 mt-1">{t('home.events_total')}</div>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 p-4 flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg flex items-center justify-center bg-blue-50 dark:bg-blue-900/20">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="var(--color-primary-blue)" strokeWidth="2" className="w-6 h-6">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 6.042A8.967 8.967 0 006 3.75c-1.052 0-2.062.18-3 .512v14.25A8.987 8.987 0 016 18c2.305 0 4.408.867 6 2.292m0-14.25a8.966 8.966 0 016-2.292c1.052 0 2.062.18 3 .512v14.25A8.987 8.987 0 0018 18a8.967 8.967 0 00-6 2.292m0-14.25v14.25" />
            </svg>
          </div>
          <div>
            <div className="text-3xl font-bold text-blue-400">{totalDiaries}</div>
            <div className="text-sm text-gray-500 dark:text-gray-400 mt-1">{t('home.diaries_total')}</div>
          </div>
        </div>
      </div>

      {/* 最近活动 + 亲密度分布 + 生命周期分布 */}
      <div className="grid grid-cols-3 gap-4 mt-6">
        {/* 最近活动（左侧 2/3） */}
        <div className="col-span-2 bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 p-4">
          <h2 className="text-lg font-semibold text-gray-800 dark:text-gray-100 mb-4">{t('home.recent_activities')}</h2>
          {recentActivities.length === 0 ? (
            <p className="text-gray-500 text-center py-12">{t('home.no_activities')}</p>
          ) : (
            <div className="space-y-2">
              {recentActivities.map((activity) => {
                const isEvent = activity.type === 'event'
                const clickable = isEvent && activity.personIds && activity.personIds.length > 0
                const dateStr = activity.date
                  ? format(new Date(activity.date + 'T00:00:00'), 'yyyy-MM-dd')
                  : ''
                return (
                  <div
                    key={`${activity.type}-${activity.id}`}
                    onClick={() => clickable && handleActivityClick(activity)}
                    className={`flex items-center gap-3 p-3 rounded-lg border border-gray-100 dark:border-gray-700 ${
                      clickable ? 'hover:bg-gray-50 dark:hover:bg-gray-700 cursor-pointer' : ''
                    } transition-colors`}
                  >
                    <span
                      className={`px-2 py-0.5 text-xs rounded-full flex-shrink-0 ${
                        isEvent
                          ? 'bg-primary-50 dark:bg-primary-900/30 text-primary-600 dark:text-primary-400'
                          : 'bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400'
                      }`}
                    >
                      {isEvent ? t('home.event_label') : t('home.diary_label')}
                    </span>
                    <span className="flex-1 truncate text-gray-800 dark:text-gray-100">{activity.title}</span>
                    <span className="text-sm text-gray-400 flex-shrink-0">{dateStr}</span>
                  </div>
                )
              })}
            </div>
          )}
        </div>

        {/* 亲密度分布饼图（右侧 1/3） */}
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 p-4">
          <h2 className="text-lg font-semibold text-gray-800 dark:text-gray-100 mb-4">{t('home.intimacy_distribution')}</h2>
          {intimacyDist.length === 0 ? (
            <p className="text-gray-500 text-center py-12">{t('home.no_relation_data')}</p>
          ) : (
            <ResponsiveContainer width="100%" height={280}>
              <PieChart>
                <Pie
                  data={intimacyData}
                  dataKey="value"
                  nameKey="name"
                  cx="50%"
                  cy="50%"
                  outerRadius={80}
                  label={(entry) => (entry.value > 0 ? entry.value : '')}
                >
                  {intimacyData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>

      {/* 生命周期分布 + 交互趋势 */}
      <div className="grid grid-cols-3 gap-4 mt-6">
        {/* 生命周期分布柱状图 */}
        <div className="col-span-2 bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 p-4">
          <h2 className="text-lg font-semibold text-gray-800 dark:text-gray-100 mb-4">{t('home.lifecycle_distribution')}</h2>
          {lifecycleData.every((d) => d.value === 0) ? (
            <p className="text-gray-500 text-center py-12">{t('home.no_lifecycle_data')}</p>
          ) : (
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={lifecycleData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                <XAxis dataKey="name" tick={{ fontSize: 12 }} stroke="#9ca3af" />
                <YAxis tick={{ fontSize: 12 }} stroke="#9ca3af" allowDecimals={false} />
                <Tooltip />
                <Bar dataKey="value">
                  {lifecycleData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>

        {/* 月度交互趋势 */}
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 p-4">
          <h2 className="text-lg font-semibold text-gray-800 dark:text-gray-100 mb-4">{t('home.interaction_trend')}</h2>
          {monthlyTrend.length === 0 ? (
            <p className="text-gray-500 text-center py-12">{t('home.no_interaction_data')}</p>
          ) : (
            <ResponsiveContainer width="100%" height={280}>
              <LineChart data={monthlyTrend}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                <XAxis dataKey="month" tick={{ fontSize: 10 }} stroke="#9ca3af" />
                <YAxis tick={{ fontSize: 10 }} stroke="#9ca3af" allowDecimals={false} />
                <Tooltip />
                <Line type="monotone" dataKey="count" stroke="var(--color-primary-blue)" strokeWidth={2} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>

      {/* 断联提醒 + 即将到期提醒 */}
      <div className="grid grid-cols-2 gap-4 mt-6">
        <LostContactAlert months={3} onPersonClick={(pid) => navigate(`/persons/${pid}`)} />
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 p-4">
          <ReminderList showUpcoming />
        </div>
      </div>
    </div>
  )
}
