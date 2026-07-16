import { useState, useEffect, useCallback, useRef, useMemo } from 'react'
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, CartesianGrid } from 'recharts'
import type { WrappedReport } from '../shared/types'

const MONTH_NAMES_SHORT = ['', '1月', '2月', '3月', '4月', '5月', '6月', '7月', '8月', '9月', '10月', '11月', '12月']

const TYPE_LABELS: Record<string, string> = { call: '通话', meet: '见面', message: '消息', social: '社交', other: '其他' }
const TYPE_COLORS: Record<string, string> = { call: '#60a5fa', meet: '#34d399', message: '#fbbf24', social: '#f472b6', other: '#9ca3af' }

function useAnimatedNumber(target: number, enabled: boolean): number {
  const [val, setVal] = useState(0)
  const raf = useRef<number>()

  useEffect(() => {
    if (!enabled) { setVal(0); return }
    const start = performance.now()
    const duration = 800 + Math.random() * 400
    const go = (now: number) => {
      const t = Math.min((now - start) / duration, 1)
      const ease = 1 - Math.pow(1 - t, 3)
      setVal(Math.round(ease * target))
      if (t < 1) raf.current = requestAnimationFrame(go)
    }
    raf.current = requestAnimationFrame(go)
    return () => { if (raf.current) cancelAnimationFrame(raf.current) }
  }, [target, enabled])

  return val
}

function AnimatedStat({ value, label, icon, color }: { value: number; label: string; icon: string; color: string }) {
  const [visible, setVisible] = useState(false)
  const ref = useRef<HTMLDivElement>(null)
  const animated = useAnimatedNumber(value, visible)

  useEffect(() => {
    const el = ref.current
    if (!el) return
    const obs = new IntersectionObserver(([e]) => { if (e.isIntersecting) { setVisible(true); obs.disconnect() } }, { threshold: 0.3 })
    obs.observe(el)
    return () => obs.disconnect()
  }, [])

  return (
    <div ref={ref} className="wrapped-stat-card">
      <div className="wrapped-stat-icon" style={{ background: `${color}18`, color }}>{icon}</div>
      <div className="wrapped-stat-value" style={{ color }}>{animated}</div>
      <div className="wrapped-stat-label">{label}</div>
    </div>
  )
}

function Section({ children, className = '', delay = 0 }: { children: React.ReactNode; className?: string; delay?: number }) {
  return <div className={`wrapped-section ${className}`} style={{ animationDelay: `${delay}s` }}>{children}</div>
}

export default function WrappedPage() {
  const currentYear = new Date().getFullYear()
  const [year, setYear] = useState(currentYear)
  const [report, setReport] = useState<WrappedReport | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const years = Array.from({ length: 5 }, (_, i) => currentYear - i)

  const loadReport = useCallback(async (y: number) => {
    setLoading(true)
    setError('')
    setReport(null)
    try {
      const result = await window.electronAPI.wrapped.generate(y)
      if (result.success) {
        // Ensure all new fields exist (defensive for old backend versions)
        const d = result.data
        d.summary = { ...d.summary, totalRelationships: d.summary.totalRelationships ?? 0, newRelationshipsThisYear: d.summary.newRelationshipsThisYear ?? 0, avgIntimacy: d.summary.avgIntimacy ?? 0 }
        d.trends = {
          ...d.trends,
          interactionTypeBreakdown: d.trends.interactionTypeBreakdown ?? [],
          topContacts: d.trends.topContacts ?? [],
          weekdayDistribution: d.trends.weekdayDistribution ?? [],
          monthlyComparison: d.trends.monthlyComparison ?? [],
          groupDistribution: d.trends.groupDistribution ?? [],
        }
        setReport(d)
      } else setError(result.error)
    } catch (e) {
      setError((e as Error).message)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { loadReport(year) }, [year, loadReport])

  const handleShare = () => {
    if (!report) return
    const lines = [
      `📊 RelMap Wrapped ${report.year}`,
      ``,
      `👥 ${report.summary.totalPersons} 位联系人 · ${report.summary.totalRelationships} 段关系`,
      ...(report.highlights.topContact ? [`⭐ 常联系: ${report.highlights.topContact.name}`] : []),
      ...(report.highlights.bestFriend.name !== '无' ? [`🤝 最佳好友: ${report.highlights.bestFriend.name}`] : []),
      ...(report.streaks.longestStreak.days > 0 ? [`🔥 最长连击: ${report.streaks.longestStreak.days}天`] : []),
      ``,
      `📅 ${report.summary.totalEvents} 个事件 · 📝 ${report.summary.totalDiaries} 篇日记`,
      `💬 ${report.summary.totalInteractions} 次互动 · 📸 ${report.summary.totalPhotos} 张照片`,
      ``,
      `—— 来自 RelMap`,
    ]
    window.electronAPI.clipboard.writeText(lines.join('\n'))
  }

  const formatMonth = (m: string) => {
    const parts = m.split('-')
    return MONTH_NAMES_SHORT[parseInt(parts[1], 10)] || m
  }

  const typeData = useMemo(() => {
    if (!report) return []
    return report.trends.interactionTypeBreakdown.map(t => ({
      name: TYPE_LABELS[t.type] || t.type,
      value: t.count,
      color: TYPE_COLORS[t.type] || '#9ca3af',
    }))
  }, [report])

  const totalInteractions = report?.summary.totalInteractions || 1

  const hasData = report && !loading && !error

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 py-8 space-y-8">
      {/* Header controls */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <h1 className="text-lg font-bold text-[var(--text-primary)] tracking-tight">年度报告</h1>
          <select
            value={year}
            onChange={(e) => setYear(Number(e.target.value))}
            className="px-3 py-1.5 rounded-lg border border-[var(--surface-border)] bg-[var(--surface)] text-[var(--text-primary)] text-sm font-medium appearance-none cursor-pointer outline-none"
          >
            {years.map((y) => <option key={y} value={y}>{y}年</option>)}
          </select>
        </div>
        {report && (
          <button onClick={handleShare} className="px-4 py-1.5 rounded-lg bg-[var(--primary-500)] text-white text-sm font-medium hover:bg-[var(--primary-600)] transition-colors">
            分享总结
          </button>
        )}
      </div>

      {loading && (
        <div className="flex flex-col items-center justify-center py-32 gap-4 text-[var(--text-secondary)]">
          <svg className="animate-spin h-8 w-8 text-[var(--primary-500)]" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" /><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" /></svg>
          <span className="text-sm">生成中…</span>
        </div>
      )}

      {error && (
        <div className="bg-red-50 dark:bg-red-900/10 border border-red-200 dark:border-red-800/30 rounded-2xl p-6 text-center">
          <p className="text-red-600 dark:text-red-400 text-sm">{error}</p>
        </div>
      )}

      {!report && !loading && !error && (
        <div className="flex flex-col items-center justify-center py-32 text-[var(--text-secondary)] gap-3">
          <div className="text-5xl">📊</div>
          <p className="text-sm">选择年份查看年度总结</p>
        </div>
      )}

      {hasData && (
        <>
          {/* ===================== COVER ===================== */}
          <Section delay={0.05}>
            <div className="wrapped-cover rounded-2xl p-8 sm:p-12 relative">
              <div className="relative z-10">
                <p className="text-xs font-semibold tracking-[0.15em] text-[var(--text-secondary)] uppercase mb-2">RelMap</p>
                <div className="wrapped-cover-year">{report.year}</div>
                <p className="text-base text-[var(--text-secondary)] mt-2 max-w-md leading-relaxed">
                  你与 <strong className="text-[var(--primary-600)]">{report.summary.totalPersons}</strong> 位联系人，
                  维系着 <strong className="text-[var(--primary-600)]">{report.summary.totalRelationships}</strong> 段关系，
                  平均亲密度 <strong className="text-[var(--primary-600)]">{report.summary.avgIntimacy}</strong>
                </p>
              </div>
            </div>
          </Section>

          {/* ===================== STATS GRID ===================== */}
          <Section delay={0.1}>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
              <AnimatedStat value={report.summary.totalPersons} label="联系人" icon="👥" color="var(--primary-500)" />
              <AnimatedStat value={report.summary.newPersons} label="新增联系人" icon="🆕" color="#34d399" />
              <AnimatedStat value={report.summary.totalInteractions} label="互动次数" icon="💬" color="#60a5fa" />
              <AnimatedStat value={report.summary.totalEvents} label="共同事件" icon="📅" color="#a78bfa" />
              <AnimatedStat value={report.summary.totalDiaries} label="日记篇数" icon="📝" color="#fbbf24" />
              <AnimatedStat value={report.summary.totalPhotos} label="照片" icon="📸" color="#f472b6" />
            </div>
          </Section>

          {/* ===================== MILESTONES ===================== */}
          <Section delay={0.15}>
            <div className="wrapped-divider"><span>年度亮点</span></div>
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mt-4">
              {report.highlights.topContact && (
                <div className="wrapped-milestone" style={{ background: 'linear-gradient(135deg, #fbbf24 0%, #f59e0b 100%)' }}>
                  <div className="text-2xl mb-1">⭐</div>
                  <div className="text-sm text-white/80">最常联系</div>
                  <div className="text-lg font-bold text-white mt-0.5 truncate">{report.highlights.topContact.name}</div>
                  <div className="text-xs text-white/70 mt-1">{report.highlights.topContact.interactionCount} 次互动</div>
                </div>
              )}
              {report.highlights.bestFriend.name !== '无' && (
                <div className="wrapped-milestone" style={{ background: 'linear-gradient(135deg, #f472b6 0%, #e11d48 100%)' }}>
                  <div className="text-2xl mb-1">🤝</div>
                  <div className="text-sm text-white/80">最佳好友</div>
                  <div className="text-lg font-bold text-white mt-0.5 truncate">{report.highlights.bestFriend.name}</div>
                  <div className="text-xs text-white/70 mt-1">共 {report.highlights.bestFriend.totalInteractions} 次互动</div>
                </div>
              )}
              {report.streaks.longestStreak.days > 0 && (
                <div className="wrapped-milestone" style={{ background: 'linear-gradient(135deg, #fb923c 0%, #dc2626 100%)' }}>
                  <div className="text-2xl mb-1">🔥</div>
                  <div className="text-sm text-white/80">最长连击</div>
                  <div className="text-lg font-bold text-white mt-0.5">{report.streaks.longestStreak.days} 天</div>
                  <div className="text-xs text-white/70 mt-1">不间断互动</div>
                </div>
              )}
              {report.highlights.longestFriendship.name !== '无' && (
                <div className="wrapped-milestone" style={{ background: 'linear-gradient(135deg, #34d399 0%, #059669 100%)' }}>
                  <div className="text-2xl mb-1">🌳</div>
                  <div className="text-sm text-white/80">最长友谊</div>
                  <div className="text-lg font-bold text-white mt-0.5 truncate">{report.highlights.longestFriendship.name}</div>
                  <div className="text-xs text-white/70 mt-1">{report.highlights.longestFriendship.years} 年</div>
                </div>
              )}
            </div>

            {report.highlights.mostImproved && (
              <div className="mt-3 grid grid-cols-2 gap-3">
                <div className="wrapped-milestone" style={{ background: 'linear-gradient(135deg, #60a5fa 0%, #2563eb 100%)' }}>
                  <div className="text-2xl mb-1">📈</div>
                  <div className="text-sm text-white/80">关系升温</div>
                  <div className="text-lg font-bold text-white mt-0.5 truncate">{report.highlights.mostImproved.name}</div>
                  <div className="text-xs text-white/70 mt-1">{report.highlights.mostImproved.intimacyStart} → {report.highlights.mostImproved.intimacyEnd}</div>
                </div>
                {report.highlights.mostPurposeful && (
                  <div className="wrapped-milestone" style={{ background: 'linear-gradient(135deg, #a78bfa 0%, #7c3aed 100%)' }}>
                    <div className="text-2xl mb-1">🎯</div>
                    <div className="text-sm text-white/80">目标明确</div>
                    <div className="text-lg font-bold text-white mt-0.5 truncate">{report.highlights.mostPurposeful.name}</div>
                    <div className="text-xs text-white/70 mt-1">{report.highlights.mostPurposeful.purpose} ×{report.highlights.mostPurposeful.count}</div>
                  </div>
                )}
              </div>
            )}
          </Section>

          {/* ===================== TOP CONTACTS ===================== */}
          {report.trends.topContacts.length > 0 && (
            <Section delay={0.2}>
              <div className="wrapped-divider"><span>互动排行 Top 5</span></div>
              <div className="wrapped-chart-card mt-4">
                <div className="space-y-3">
                  {report.trends.topContacts.map((c, i) => {
                    const pct = Math.round((c.interactionCount / totalInteractions) * 100)
                    const barW = Math.max(8, pct * 2.5)
                    const colors = ['#f59e0b', '#60a5fa', '#34d399', '#a78bfa', '#f472b6']
                    return (
                      <div key={c.name}>
                        <div className="flex items-center justify-between text-sm mb-1">
                          <div className="flex items-center gap-2 min-w-0">
                            <span className="text-xs font-bold text-[var(--text-secondary)] w-4">{i + 1}</span>
                            <span className="font-medium text-[var(--text-primary)] truncate">{c.name}</span>
                          </div>
                          <span className="text-xs text-[var(--text-secondary)] flex-shrink-0 ml-2">{c.interactionCount} 次 · 亲密度 {c.intimacy}</span>
                        </div>
                        <div className="w-full h-2 bg-[var(--surface-alt)] rounded-full overflow-hidden">
                          <div className="h-full rounded-full transition-all duration-700 ease-out" style={{ width: `${barW}%`, backgroundColor: colors[i] }} />
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            </Section>
          )}

          {/* ===================== MONTHLY TREND ===================== */}
          <Section delay={0.25}>
            <div className="wrapped-divider"><span>互动趋势</span></div>
            <div className="wrapped-chart-card mt-4">
              <div className="wrapped-chart-title">📆 月度互动</div>
              {report.trends.monthlyInteractions.length > 0 ? (
                <ResponsiveContainer width="100%" height={260}>
                  <BarChart data={report.trends.monthlyInteractions.map(m => ({ ...m, month: formatMonth(m.month) }))} margin={{ top: 4, right: 4, bottom: 0, left: -16 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--surface-border)" vertical={false} />
                    <XAxis dataKey="month" tick={{ fontSize: 11, fill: 'var(--text-secondary)' }} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fontSize: 11, fill: 'var(--text-secondary)' }} axisLine={false} tickLine={false} />
                    <Tooltip
                      contentStyle={{ background: 'var(--surface)', border: '1px solid var(--surface-border)', borderRadius: 10, fontSize: 13, boxShadow: '0 4px 12px rgba(0,0,0,0.06)' }}
                      labelStyle={{ fontWeight: 600, color: 'var(--text-primary)' }}
                    />
                    <Bar dataKey="count" radius={[6, 6, 0, 0]} maxBarSize={32}>
                      {report.trends.monthlyInteractions.map((_, i) => (
                        <Cell key={i} fill={i === 0 ? 'var(--primary-400)' : 'color-mix(in srgb, var(--primary-400) 60%, transparent)'} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <p className="text-center py-10 text-sm text-[var(--text-secondary)]">暂无月度互动数据</p>
              )}
            </div>

            {/* Year-over-year comparison */}
            {report.trends.monthlyComparison.some(m => m.lastYear > 0) && (
              <div className="wrapped-chart-card mt-4">
                <div className="wrapped-chart-title">📊 同比 {report.year - 1} 年</div>
                <ResponsiveContainer width="100%" height={240}>
                  <BarChart data={report.trends.monthlyComparison.map(m => ({ ...m, monthLabel: MONTH_NAMES_SHORT[parseInt(m.month)] }))} margin={{ top: 4, right: 4, bottom: 0, left: -16 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--surface-border)" vertical={false} />
                    <XAxis dataKey="monthLabel" tick={{ fontSize: 11, fill: 'var(--text-secondary)' }} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fontSize: 11, fill: 'var(--text-secondary)' }} axisLine={false} tickLine={false} />
                    <Tooltip
                      contentStyle={{ background: 'var(--surface)', border: '1px solid var(--surface-border)', borderRadius: 10, fontSize: 13 }}
                    />
                    <Bar dataKey="lastYear" name={`${report.year - 1}年`} radius={[4, 4, 0, 0]} maxBarSize={14} fill="#d1d5db" />
                    <Bar dataKey="currentYear" name={`${report.year}年`} radius={[4, 4, 0, 0]} maxBarSize={14} fill="var(--primary-400)" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}
          </Section>

          {/* ===================== INTERACTION TYPE + WEEKDAY ===================== */}
          <Section delay={0.3}>
            <div className="wrapped-divider"><span>互动画像</span></div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-4">
              {typeData.length > 0 && (
                <div className="wrapped-chart-card">
                  <div className="wrapped-chart-title">💬 互动方式</div>
                  <div className="flex items-center gap-6">
                    <div className="flex-shrink-0">
                      <ResponsiveContainer width={140} height={140}>
                        <PieChart>
                          <Pie data={typeData} cx="50%" cy="50%" innerRadius={38} outerRadius={62} dataKey="value" paddingAngle={3}>
                            {typeData.map((e, i) => <Cell key={i} fill={e.color} />)}
                          </Pie>
                        </PieChart>
                      </ResponsiveContainer>
                    </div>
                    <div className="flex-1 space-y-2 min-w-0">
                      {typeData.map(t => (
                        <div key={t.name} className="flex items-center gap-2 text-sm">
                          <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: t.color }} />
                          <span className="text-[var(--text-secondary)] flex-1 truncate">{t.name}</span>
                          <span className="font-medium text-[var(--text-primary)]">{t.value}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {report.trends.weekdayDistribution.length > 0 && (
                <div className="wrapped-chart-card">
                  <div className="wrapped-chart-title">📅 活跃星期</div>
                  <div className="space-y-2">
                    {report.trends.weekdayDistribution.map(d => {
                      const maxVal = Math.max(...report.trends.weekdayDistribution.map(w => w.count))
                      const pct = maxVal > 0 ? (d.count / maxVal) * 100 : 0
                      return (
                        <div key={d.weekday} className="flex items-center gap-3">
                          <span className="text-xs text-[var(--text-secondary)] w-8 flex-shrink-0">{d.weekday}</span>
                          <div className="flex-1 h-5 bg-[var(--surface-alt)] rounded-full overflow-hidden relative">
                            <div
                              className="h-full rounded-full transition-all duration-700 ease-out"
                              style={{ width: `${pct}%`, background: 'linear-gradient(90deg, var(--primary-300), var(--primary-500))' }}
                            />
                          </div>
                          <span className="text-xs font-medium text-[var(--text-primary)] w-8 text-right flex-shrink-0">{d.count}</span>
                        </div>
                      )
                    })}
                  </div>
                </div>
              )}
            </div>
          </Section>

          {/* ===================== INTIMACY GROWTH + GROUP DIST ===================== */}
          <Section delay={0.35}>
            <div className="wrapped-divider"><span>关系生态</span></div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-4">
              {report.trends.intimacyGrowth.length > 0 && (
                <div className="wrapped-chart-card">
                  <div className="wrapped-chart-title">📈 亲密度变化</div>
                  <div className="space-y-3">
                    {report.trends.intimacyGrowth.map((g, i) => {
                      const change = g.end - g.start
                      const isUp = change >= 0
                      return (
                        <div key={i} className="flex items-center justify-between">
                          <span className="text-sm text-[var(--text-primary)] truncate flex-1">{g.name}</span>
                          <div className="flex items-center gap-2 text-xs">
                            <span className="text-[var(--text-secondary)]">{g.start}</span>
                            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className={`w-3.5 h-3.5 ${isUp ? 'text-green-500' : 'text-red-400'} ${isUp ? '' : 'rotate-180'}`}>
                              <path fillRule="evenodd" d="M10 17a.75.75 0 01-.75-.75V5.612L5.29 9.77a.75.75 0 01-1.08-1.04l5.25-5.5a.75.75 0 011.08 0l5.25 5.5a.75.75 0 11-1.08 1.04l-3.96-4.158V16.25A.75.75 0 0110 17z" clipRule="evenodd" />
                            </svg>
                            <span className="font-semibold" style={{ color: isUp ? '#34d399' : '#f87171' }}>{g.end}</span>
                            <span className="text-[var(--text-secondary)] ml-1">({isUp ? '+' : ''}{change})</span>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </div>
              )}

              {report.trends.groupDistribution.length > 0 && (
                <div className="wrapped-chart-card">
                  <div className="wrapped-chart-title">🏷️ 分组分布</div>
                  <div className="space-y-2.5">
                    {report.trends.groupDistribution.map(g => {
                      const total = report.summary.totalPersons
                      const pct = total > 0 ? Math.round((g.count / total) * 100) : 0
                      return (
                        <div key={g.name}>
                          <div className="flex justify-between text-sm mb-1">
                            <span className="text-[var(--text-primary)] truncate">{g.name}</span>
                            <span className="text-[var(--text-secondary)] text-xs">{g.count} · {pct}%</span>
                          </div>
                          <div className="w-full h-1.5 bg-[var(--surface-alt)] rounded-full overflow-hidden">
                            <div className="h-full rounded-full" style={{ width: `${pct}%`, background: 'linear-gradient(90deg, var(--primary-400), var(--primary-500))' }} />
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </div>
              )}
            </div>
          </Section>

          {/* ===================== STREAKS ===================== */}
          <Section delay={0.4}>
            <div className="wrapped-divider"><span>连续互动</span></div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-4">
              <div className="wrapped-chart-card flex items-center gap-5">
                <div className="w-20 h-20 rounded-full bg-gradient-to-br from-orange-400 to-red-500 flex items-center justify-center text-white text-2xl font-bold flex-shrink-0 shadow-lg">
                  {report.streaks.longestStreak.days}
                </div>
                <div>
                  <div className="text-sm font-semibold text-[var(--text-primary)]">最长连续互动</div>
                  <div className="text-xs text-[var(--text-secondary)] mt-0.5">
                    {report.streaks.longestStreak.days > 0 ? `截止 ${report.streaks.longestStreak.endDate}` : '暂无记录'}
                  </div>
                  <div className="text-xs text-[var(--text-secondary)] mt-0.5">{report.streaks.longestStreak.days} 天不间断</div>
                </div>
              </div>
              <div className="wrapped-chart-card flex items-center gap-5">
                <div className="w-20 h-20 rounded-full bg-gradient-to-br from-amber-400 to-yellow-500 flex items-center justify-center text-white text-2xl font-bold flex-shrink-0 shadow-lg">
                  {report.streaks.currentStreak}
                </div>
                <div>
                  <div className="text-sm font-semibold text-[var(--text-primary)]">当前连续</div>
                  <div className="text-xs text-[var(--text-secondary)] mt-0.5">保持联系中</div>
                  <div className="text-xs text-[var(--text-secondary)] mt-0.5">
                    {report.streaks.currentStreak > 0 ? '🏃 继续加油！' : '💪 从今天开始？'}
                  </div>
                </div>
              </div>
            </div>
          </Section>

          {/* ===================== FOOTER ===================== */}
          <Section delay={0.45}>
            <div className="text-center py-8">
              <div className="text-4xl mb-3">💝</div>
              <p className="text-sm text-[var(--text-secondary)] max-w-md mx-auto leading-relaxed">
                每一段关系都值得被珍视。<br />
                {report.year} 年，你用心经营了 {report.summary.totalPersons} 段关系。
              </p>
              <p className="text-[10px] text-[var(--text-secondary)] mt-4 tracking-[0.1em] uppercase">RelMap · 关系管理</p>
            </div>
          </Section>
        </>
      )}
    </div>
  )
}
