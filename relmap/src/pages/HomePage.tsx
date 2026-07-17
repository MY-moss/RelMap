import { useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import { useNavigate } from 'react-router-dom'
import { usePersonList, useGraphData } from '../hooks'
import { useLifecycleDistribution, useMonthlyInteractionTrend } from '../hooks'
import DashboardGrid from '../components/dashboard/DashboardGrid'

export default function HomePage() {
  const { t } = useTranslation()
  const navigate = useNavigate()

  const { data: persons = [], isLoading: loading } = usePersonList({ limit: 20, sort_by: 'created_at', sort_order: 'desc' })

  const { data: lifecycleDist = [] } = useLifecycleDistribution()
  const { data: monthlyTrend = [] } = useMonthlyInteractionTrend(12)
  const { data: graphData } = useGraphData(0, 50)

  const networkStats = useMemo(() => {
    if (!graphData || graphData.edges.length === 0) {
      return { totalNodes: 0, totalEdges: 0, connectedComponents: 0, avgIntimacy: 0, density: 0 }
    }
    const totalNodes = graphData.nodes.length
    const totalEdges = graphData.edges.length
    const avgIntimacy = Math.round((graphData.edges.reduce((sum, e) => sum + e.intimacy, 0) / totalEdges) * 10) / 10
    const parent = new Map<string, string>()
    const find = (x: string): string => {
      if (!parent.has(x)) parent.set(x, x)
      if (parent.get(x) !== x) parent.set(x, find(parent.get(x)!))
      return parent.get(x)!
    }
    for (const edge of graphData.edges) { const ra = find(edge.source); const rb = find(edge.target); if (ra !== rb) parent.set(ra, rb) }
    const roots = new Set<string>()
    for (const node of graphData.nodes) roots.add(find(node.id))
    return { totalNodes, totalEdges, connectedComponents: roots.size, avgIntimacy, density: totalNodes > 1 ? Math.round((totalEdges * 2) / (totalNodes * (totalNodes - 1)) * 10000) / 10000 : 0 }
  }, [graphData])

  const totalPersons = persons.length
  const lostCount = lifecycleDist.find(d => d.stage === 'lost')?.count ?? 0
  const notLostRatioVal = totalPersons > 0 ? (totalPersons - lostCount) / totalPersons : 0
  const recentMonthCount = monthlyTrend.length > 0 ? monthlyTrend[monthlyTrend.length - 1].count : 0
  const frequencyScore = Math.min(recentMonthCount / totalPersons * 20, 100)

  const healthScore = useMemo(() => {
    if (totalPersons === 0) return { score: 0, level: 'neutral' as const, color: '#9ca3af' }
    const s = Math.round(notLostRatioVal * 40 + (networkStats.avgIntimacy / 100) * 35 + (frequencyScore / 100) * 25)
    const level = s >= 70 ? 'good' as const : s >= 40 ? 'fair' as const : 'poor' as const
    const color = s >= 70 ? 'var(--color-lifecycle-active)' : s >= 40 ? 'var(--color-lifecycle-maintain)' : 'var(--color-lifecycle-lost)'
    return { score: s, level, color }
  }, [totalPersons, notLostRatioVal, networkStats.avgIntimacy, frequencyScore])

  if (loading) {
    return <div className="p-6 page-enter"><p className="text-gray-500">{t('common.loading')}</p></div>
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
          <button onClick={() => navigate('/persons')} className="px-5 py-2 bg-primary-500 hover:bg-primary-600 text-white rounded-lg transition-colors">{t('home.go_add_contact')}</button>
        </div>
      </div>
    )
  }

  return (
    <div className="p-6 page-enter">
      <h1 className="text-2xl font-bold text-gray-800 dark:text-gray-100">{t('home.title')}</h1>

      <div className="mt-6 bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 p-4">
        <div className="flex items-center gap-4">
          <div className="w-16 h-16 rounded-full flex items-center justify-center text-white text-2xl font-bold" style={{ backgroundColor: healthScore.color }}>{healthScore.score}</div>
          <div>
            <div className="text-lg font-semibold text-gray-800 dark:text-gray-100">{t('home.social_health')}</div>
            <div className="text-sm text-gray-500 dark:text-gray-400">{healthScore.level === 'good' ? t('home.health_good') : healthScore.level === 'fair' ? t('home.health_fair') : t('home.health_poor')}</div>
          </div>
          <div className="ml-auto flex gap-6 text-sm">
            <div className="text-center"><div className="text-xl font-bold text-gray-800 dark:text-gray-100">{networkStats.totalNodes}</div><div className="text-gray-400">{t('home.contacts')}</div></div>
            <div className="text-center"><div className="text-xl font-bold text-gray-800 dark:text-gray-100">{networkStats.totalEdges}</div><div className="text-gray-400">{t('home.relations_count')}</div></div>
            <div className="text-center"><div className="text-xl font-bold text-gray-800 dark:text-gray-100">{networkStats.avgIntimacy}</div><div className="text-gray-400">{t('home.avg_intimacy')}</div></div>
            <div className="text-center"><div className="text-xl font-bold text-gray-800 dark:text-gray-100">{networkStats.connectedComponents}</div><div className="text-gray-400">{t('home.social_circles')}</div></div>
          </div>
        </div>
      </div>

      <div className="mt-6">
        <DashboardGrid />
      </div>
    </div>
  )
}
