import { useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { format } from 'date-fns'
import { PieChart, Pie, Cell, Legend, Tooltip, ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, LineChart, Line } from 'recharts'
import type { EventItem } from '../../shared/types'
import WidgetShell from './WidgetShell'
import { usePersonList, useEventList, useDiaryList, useIntimacyDistribution, useMainPerson, usePersonRelations } from '../../hooks'
import { useLifecycleDistribution, useMonthlyInteractionTrend } from '../../hooks'
import LostContactAlert from '../reminders/LostContactAlert'
import ReminderList from '../reminders/ReminderList'

type Activity = { type: 'event' | 'diary'; id: string; title: string; date: string; personIds?: string[] }

const INTIMACY_BUCKETS = [
  { name: '疏远 (0-20)', min: 0, max: 20, color: 'var(--color-intimacy-distant)' },
  { name: '普通 (21-40)', min: 21, max: 40, color: 'var(--color-intimacy-normal)' },
  { name: '朋友 (41-60)', min: 41, max: 60, color: 'var(--color-intimacy-friend)' },
  { name: '好朋友 (61-80)', min: 61, max: 80, color: 'var(--color-intimacy-close)' },
  { name: '亲密 (81-100)', min: 81, max: 100, color: 'var(--color-intimacy-intimate)' },
]

const LIFECYCLE_LABELS: Record<string, string> = {
  new: '新认识', active: '活跃', maintain: '维护', dormant: '休眠', lost: '断联', archived: '已归档',
}

const LIFECYCLE_COLORS: Record<string, string> = {
  new: 'var(--color-lifecycle-new)', active: 'var(--color-lifecycle-active)', maintain: 'var(--color-lifecycle-maintain)',
  dormant: 'var(--color-lifecycle-dormant)', lost: 'var(--color-lifecycle-lost)', archived: 'var(--color-lifecycle-archived)',
}

export function StatsOverviewWidget({ onRemove }: { onRemove?: () => void }) {
  const { data: persons = [] } = usePersonList({ limit: 20, sort_by: 'created_at', sort_order: 'desc' })
  const { data: events = [] } = useEventList()
  const { data: diaries = [] } = useDiaryList()
  const totalPersons = persons.length
  const favoritePersons = persons.filter(p => p.is_favorite).length

  const cards = [
    { label: '联系人', value: totalPersons, color: 'text-orange-500', bg: 'bg-orange-50 dark:bg-orange-900/20', icon: 'M15 19.128a9.38...' },
    { label: '收藏', value: favoritePersons, color: 'text-amber-400', bg: 'bg-amber-50 dark:bg-amber-900/20', icon: 'M11.48 3.499a.562...' },
    { label: '事件', value: events.length, color: 'text-green-400', bg: 'bg-green-50 dark:bg-green-900/20', icon: 'M6.75 3v2.25...' },
    { label: '日记', value: diaries.length, color: 'text-blue-400', bg: 'bg-blue-50 dark:bg-blue-900/20', icon: 'M12 6.042A8.967...' },
  ]

  return (
    <WidgetShell title="数据概览" onRemove={onRemove}>
      <div className="grid grid-cols-4 gap-3">
        {cards.map(card => (
          <div key={card.label} className={`${card.bg} rounded-lg p-3 flex items-center gap-2`}>
            <div>
              <div className={`text-2xl font-bold ${card.color}`}>{card.value}</div>
              <div className="text-xs text-gray-500 dark:text-gray-400">{card.label}</div>
            </div>
          </div>
        ))}
      </div>
    </WidgetShell>
  )
}

export function RecentActivityWidget({ onRemove }: { onRemove?: () => void }) {
  const navigate = useNavigate()
  const { data: events = [] } = useEventList()
  const { data: diaries = [] } = useDiaryList()

  const activities: Activity[] = useMemo(() => {
    const eventItems: Activity[] = events.map(e => ({ type: 'event', id: e.id, title: e.title, date: e.event_date, personIds: (e as EventItem & { person_ids?: string[] }).person_ids }))
    const diaryItems: Activity[] = diaries.map(d => ({ type: 'diary', id: d.id, title: d.title || d.content.slice(0, 20), date: d.diary_date }))
    return [...eventItems, ...diaryItems].sort((a, b) => b.date.localeCompare(a.date)).slice(0, 5)
  }, [events, diaries])

  return (
    <WidgetShell title="最近活动" onRemove={onRemove}>
      {activities.length === 0 ? (
        <p className="text-gray-500 text-center py-8">暂无活动</p>
      ) : (
        <div className="space-y-2">
          {activities.map(a => {
            const clickable = a.type === 'event' && a.personIds && a.personIds.length > 0
            return (
              <div key={`${a.type}-${a.id}`} onClick={() => clickable && navigate(`/persons/${a.personIds![0]}`)}
                className={`flex items-center gap-3 p-2.5 rounded-lg border border-gray-100 dark:border-gray-700 ${clickable ? 'hover:bg-gray-50 dark:hover:bg-gray-700 cursor-pointer' : ''} transition-colors`}>
                <span className={`px-2 py-0.5 text-xs rounded-full ${a.type === 'event' ? 'bg-primary-50 text-primary-600' : 'bg-blue-50 text-blue-600'}`}>
                  {a.type === 'event' ? '事件' : '日记'}
                </span>
                <span className="flex-1 truncate text-sm text-gray-800 dark:text-gray-100">{a.title}</span>
                <span className="text-xs text-gray-400">{a.date ? format(new Date(a.date + 'T00:00:00'), 'MM-dd') : ''}</span>
              </div>
            )
          })}
        </div>
      )}
    </WidgetShell>
  )
}

export function IntimacyDistributionWidget({ onRemove }: { onRemove?: () => void }) {
  const { data: intimacyDist = [] } = useIntimacyDistribution()
  const distMap = new Map(intimacyDist.map(d => [d.bucket, d.count]))
  const data = INTIMACY_BUCKETS.map((b, i) => ({ name: b.name, value: distMap.get(i) ?? 0, color: b.color }))

  return (
    <WidgetShell title="亲密度分布" onRemove={onRemove}>
      {intimacyDist.length === 0 ? (
        <p className="text-gray-500 text-center py-8">暂无数据</p>
      ) : (
        <ResponsiveContainer width="100%" height={220}>
          <PieChart>
            <Pie data={data} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={70} label={e => (e.value > 0 ? e.value : '')}>
              {data.map((_, i) => <Cell key={i} fill={data[i].color} />)}
            </Pie>
            <Tooltip /><Legend />
          </PieChart>
        </ResponsiveContainer>
      )}
    </WidgetShell>
  )
}

export function LifecycleDistributionWidget({ onRemove }: { onRemove?: () => void }) {
  const { data: lifecycleDist = [] } = useLifecycleDistribution()
  const data = Object.entries(LIFECYCLE_LABELS).map(([stage, label]) => {
    const found = lifecycleDist.find(d => d.stage === stage)
    return { name: label, value: found?.count ?? 0, color: LIFECYCLE_COLORS[stage] ?? '#9ca3af' }
  })

  return (
    <WidgetShell title="生命周期分布" onRemove={onRemove}>
      {data.every(d => d.value === 0) ? (
        <p className="text-gray-500 text-center py-8">暂无数据</p>
      ) : (
        <ResponsiveContainer width="100%" height={220}>
          <BarChart data={data}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
            <XAxis dataKey="name" tick={{ fontSize: 11 }} stroke="#9ca3af" />
            <YAxis tick={{ fontSize: 11 }} stroke="#9ca3af" allowDecimals={false} />
            <Tooltip />
            <Bar dataKey="value">{data.map((_, i) => <Cell key={i} fill={data[i].color} />)}</Bar>
          </BarChart>
        </ResponsiveContainer>
      )}
    </WidgetShell>
  )
}

export function MonthlyTrendWidget({ onRemove }: { onRemove?: () => void }) {
  const { data: monthlyTrend = [] } = useMonthlyInteractionTrend(12)

  return (
    <WidgetShell title="月度交互趋势" onRemove={onRemove}>
      {monthlyTrend.length === 0 ? (
        <p className="text-gray-500 text-center py-8">暂无数据</p>
      ) : (
        <ResponsiveContainer width="100%" height={220}>
          <LineChart data={monthlyTrend}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
            <XAxis dataKey="month" tick={{ fontSize: 10 }} stroke="#9ca3af" />
            <YAxis tick={{ fontSize: 10 }} stroke="#9ca3af" allowDecimals={false} />
            <Tooltip />
            <Line type="monotone" dataKey="count" stroke="var(--color-primary-blue)" strokeWidth={2} dot={false} />
          </LineChart>
        </ResponsiveContainer>
      )}
    </WidgetShell>
  )
}

export function LostContactWidget({ onRemove }: { onRemove?: () => void }) {
  const navigate = useNavigate()
  return (
    <WidgetShell title="断联提醒" onRemove={onRemove}>
      <LostContactAlert months={3} onPersonClick={pid => navigate(`/persons/${pid}`)} />
    </WidgetShell>
  )
}

export function ReminderWidget({ onRemove }: { onRemove?: () => void }) {
  return (
    <WidgetShell title="待办提醒" onRemove={onRemove}>
      <div className="max-h-60 overflow-y-auto">
        <ReminderList showUpcoming />
      </div>
    </WidgetShell>
  )
}

export function MainIdentityWidget({ onRemove }: { onRemove?: () => void }) {
  const navigate = useNavigate()
  const { data: mainPerson } = useMainPerson()
  const { data: mainRelations = [] } = usePersonRelations(mainPerson?.id ?? '', !!mainPerson)

  if (!mainPerson) return null

  return (
    <WidgetShell title="主身份概览" onRemove={onRemove}>
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <span className="text-lg">👤</span>
          <div>
            <span className="font-semibold text-gray-800 dark:text-gray-100">{mainPerson.name}</span>
            <span className="ml-2 text-xs bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full">主身份</span>
            {mainPerson.company && <span className="ml-2 text-sm text-gray-500">{mainPerson.company}</span>}
          </div>
        </div>
        <button onClick={() => navigate(`/persons/${mainPerson.id}`)} className="text-xs text-primary-500 hover:text-primary-700">详情 →</button>
      </div>
      {mainRelations.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {mainRelations.slice(0, 6).map(rel => (
            <span key={rel.id} onClick={() => navigate(`/persons/${rel.related_person_id}`)}
              className="text-xs px-2 py-1 bg-amber-50 text-amber-700 rounded-full cursor-pointer hover:bg-amber-100 transition-colors">
              {rel.related_person_name}
              {rel.relation_label && <span className="text-amber-400 ml-1">{rel.relation_label}</span>}
            </span>
          ))}
        </div>
      )}
    </WidgetShell>
  )
}

export const WIDGET_REGISTRY: Record<string, { title: string; component: (props: { onRemove?: () => void }) => JSX.Element | null }> = {
  'stats-overview': { title: '数据概览', component: StatsOverviewWidget },
  'recent-activity': { title: '最近活动', component: RecentActivityWidget },
  'intimacy-distribution': { title: '亲密度分布', component: IntimacyDistributionWidget },
  'lifecycle-distribution': { title: '生命周期分布', component: LifecycleDistributionWidget },
  'monthly-trend': { title: '月度交互趋势', component: MonthlyTrendWidget },
  'lost-contact': { title: '断联提醒', component: LostContactWidget },
  'reminders': { title: '待办提醒', component: ReminderWidget },
  'main-identity': { title: '主身份概览', component: MainIdentityWidget },
}
