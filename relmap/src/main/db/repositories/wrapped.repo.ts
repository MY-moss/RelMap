import { getDb } from '../connection'
import type { Result } from '../../../shared/types'

export interface WrappedReport {
  year: number
  summary: {
    totalPersons: number
    newPersons: number
    totalEvents: number
    totalDiaries: number
    totalInteractions: number
    totalPhotos: number
    totalRelationships: number
    newRelationshipsThisYear: number
    avgIntimacy: number
  }
  highlights: {
    topContact: { name: string; intimacy: number; interactionCount: number } | null
    mostImproved: { name: string; intimacyStart: number; intimacyEnd: number } | null
    mostActiveMonth: { month: string; count: number }
    longestFriendship: { name: string; years: number }
    bestFriend: { name: string; totalInteractions: number }
    mostPurposeful: { name: string; purpose: string; count: number } | null
  }
  streaks: {
    longestStreak: { days: number; endDate: string }
    currentStreak: number
  }
  trends: {
    monthlyInteractions: { month: string; count: number }[]
    intimacyGrowth: { name: string; start: number; end: number }[]
    interactionTypeBreakdown: { type: string; count: number }[]
    topContacts: { name: string; interactionCount: number; intimacy: number }[]
    weekdayDistribution: { weekday: string; count: number }[]
    monthlyComparison: { month: string; currentYear: number; lastYear: number }[]
    groupDistribution: { name: string; count: number }[]
  }
}

export function generateWrappedReport(year: number): Result<WrappedReport> {
  try {
    const db = getDb()
    const yearStart = `${year}-01-01`
    const yearEnd = `${year}-12-31`

    const personCount = db.prepare(
      `SELECT COUNT(*) AS c FROM persons WHERE is_archived = 0`
    ).get() as { c: number }

    const newPersonCount = db.prepare(
      `SELECT COUNT(*) AS c FROM persons WHERE created_at >= ? AND created_at <= ?`
    ).get(yearStart, yearEnd + ' 23:59:59') as { c: number }

    const eventCount = db.prepare(
      `SELECT COUNT(*) AS c FROM events WHERE event_date >= ? AND event_date <= ?`
    ).get(yearStart, yearEnd) as { c: number }

    const diaryCount = db.prepare(
      `SELECT COUNT(*) AS c FROM diaries WHERE diary_date >= ? AND diary_date <= ?`
    ).get(yearStart, yearEnd) as { c: number }

    const interactionCount = db.prepare(
      `SELECT COUNT(*) AS c FROM interaction_logs WHERE interact_at >= ? AND interact_at <= ?`
    ).get(yearStart, yearEnd + ' 23:59:59') as { c: number }

    const photoCount = db.prepare(
      `SELECT COUNT(*) AS c FROM photos WHERE created_at >= ? AND created_at <= ?`
    ).get(yearStart, yearEnd + ' 23:59:59') as { c: number }

    const relationshipCount = db.prepare(
      `SELECT COUNT(*) AS c FROM relationships`
    ).get() as { c: number }

    const newRelationshipCount = db.prepare(
      `SELECT COUNT(*) AS c FROM relationships WHERE created_at >= ? AND created_at <= ?`
    ).get(yearStart, yearEnd + ' 23:59:59') as { c: number }

    const avgIntimacyRow = db.prepare(
      `SELECT COALESCE(AVG(intimacy), 0) AS avg FROM relationships`
    ).get() as { avg: number }

    const topContactRow = db.prepare(`
      SELECT p.name, COALESCE(r.intimacy, 0) AS intimacy, cnt.interactionCount
      FROM persons p
      LEFT JOIN (
        SELECT person_id, COUNT(*) AS interactionCount
        FROM interaction_logs
        WHERE interact_at >= ? AND interact_at <= ?
        GROUP BY person_id
      ) cnt ON p.id = cnt.person_id
      LEFT JOIN (
        SELECT person_id, intimacy
        FROM relationships
        WHERE person_id IN (SELECT person_id FROM (
          SELECT person_id, COUNT(*) AS c FROM interaction_logs
          WHERE interact_at >= ? AND interact_at <= ?
          GROUP BY person_id
        ))
      ) r ON p.id = r.person_id
      WHERE cnt.interactionCount IS NOT NULL
      ORDER BY cnt.interactionCount DESC
      LIMIT 1
    `).get(yearStart, yearEnd, yearStart, yearEnd) as { name: string; intimacy: number; interactionCount: number } | undefined

    const mostImproved = db.prepare(`
      WITH year_intimacy AS (
        SELECT il.person_id,
               MIN(il.interact_at) AS first_date,
               MAX(il.interact_at) AS last_date
        FROM interaction_logs il
        WHERE il.interact_at >= ? AND il.interact_at <= ?
        GROUP BY il.person_id
        HAVING first_date != last_date
      )
      SELECT p.name,
             COALESCE(r_first.intimacy, 0) AS intimacyStart,
             COALESCE(r_last.intimacy, 0) AS intimacyEnd
      FROM year_intimacy yi
      JOIN persons p ON yi.person_id = p.id
      LEFT JOIN relationships r_first ON r_first.person_id = yi.person_id
      LEFT JOIN relationships r_last ON r_last.person_id = yi.person_id
      ORDER BY (COALESCE(r_last.intimacy, 0) - COALESCE(r_first.intimacy, 0)) DESC
      LIMIT 1
    `).get(yearStart, yearEnd) as { name: string; intimacyStart: number; intimacyEnd: number } | undefined

    const monthlyData = db.prepare(`
      SELECT strftime('%Y-%m', interact_at) AS month, COUNT(*) AS count
      FROM interaction_logs
      WHERE interact_at >= ? AND interact_at <= ?
      GROUP BY month
      ORDER BY month
    `).all(yearStart, yearEnd + ' 23:59:59') as { month: string; count: number }[]

    const mostActiveMonth = monthlyData.reduce(
      (max, cur) => (cur.count > max.count ? cur : max),
      monthlyData.length > 0 ? { month: '', count: 0 } : { month: '无数据', count: 0 }
    )

    const oldestPerson = db.prepare(`
      SELECT p.name, p.created_at
      FROM persons p
      WHERE p.is_archived = 0
      ORDER BY p.created_at ASC
      LIMIT 1
    `).get() as { name: string; created_at: string } | undefined

    const longestFriendshipYears = oldestPerson
      ? Math.max(1, year - new Date(oldestPerson.created_at).getFullYear())
      : 0

    const bestFriendRow = db.prepare(`
      SELECT p.name, COUNT(*) AS totalInteractions
      FROM interaction_logs il
      JOIN persons p ON il.person_id = p.id
      WHERE il.interact_at >= ? AND il.interact_at <= ?
      GROUP BY il.person_id
      ORDER BY totalInteractions DESC
      LIMIT 1
    `).get(yearStart, yearEnd) as { name: string; totalInteractions: number } | undefined

    const mostPurposefulRow = db.prepare(`
      SELECT p.name, il.purpose, COUNT(*) AS count
      FROM interaction_logs il
      JOIN persons p ON il.person_id = p.id
      WHERE il.purpose IS NOT NULL AND il.purpose != ''
        AND il.interact_at >= ? AND il.interact_at <= ?
      GROUP BY il.person_id, il.purpose
      ORDER BY count DESC
      LIMIT 1
    `).get(yearStart, yearEnd) as { name: string; purpose: string; count: number } | undefined

    const allInteractionDays = db.prepare(`
      SELECT DISTINCT substr(interact_at, 1, 10) AS day
      FROM interaction_logs
      WHERE interact_at >= ? AND interact_at <= ?
      ORDER BY day
    `).all(yearStart, yearEnd + ' 23:59:59') as { day: string }[]

    let longestStreak = 0
    let currentStreak = 0
    let streakEnd = ''
    let tempStreak = 0
    let tempEnd = ''

    for (let i = 0; i < allInteractionDays.length; i++) {
      const cur = allInteractionDays[i]
      if (i === 0) {
        tempStreak = 1
        tempEnd = cur.day
      } else {
        const prev = allInteractionDays[i - 1]
        const prevDate = new Date(prev.day)
        const curDate = new Date(cur.day)
        const diffDays = Math.round((curDate.getTime() - prevDate.getTime()) / 86400000)
        if (diffDays === 1) {
          tempStreak++
          tempEnd = cur.day
        } else {
          if (tempStreak > longestStreak) {
            longestStreak = tempStreak
            streakEnd = tempEnd
          }
          tempStreak = 1
          tempEnd = cur.day
        }
      }
    }
    if (tempStreak > longestStreak) {
      longestStreak = tempStreak
      streakEnd = tempEnd
    }

    if (allInteractionDays.length > 0) {
      const lastDay = allInteractionDays[allInteractionDays.length - 1]
      const today = new Date()
      const lastDate = new Date(lastDay.day)
      const diffFromToday = Math.round((today.getTime() - lastDate.getTime()) / 86400000)
      currentStreak = diffFromToday <= 1 ? tempStreak : 0
    }

    const growthRows = db.prepare(`
      SELECT p.name,
             COALESCE(r.intimacy, 0) AS intimacy
      FROM persons p
      LEFT JOIN relationships r ON p.id = r.person_id
      WHERE p.is_archived = 0
        AND p.created_at <= ?
      GROUP BY p.id
      ORDER BY RANDOM()
      LIMIT 5
    `).all(yearEnd + ' 23:59:59') as { name: string; intimacy: number }[]

    const intimacyGrowth = growthRows.map(r => ({
      name: r.name,
      start: Math.max(0, r.intimacy - 20),
      end: r.intimacy,
    }))

    // --- New queries ---
    const typeBreakdown = db.prepare(`
      SELECT COALESCE(interact_type, 'other') AS type, COUNT(*) AS count
      FROM interaction_logs
      WHERE interact_at >= ? AND interact_at <= ?
      GROUP BY type
      ORDER BY count DESC
    `).all(yearStart, yearEnd + ' 23:59:59') as { type: string; count: number }[]

    const topContactsRows = db.prepare(`
      SELECT p.name, cnt.interactionCount, COALESCE(r.intimacy, 0) AS intimacy
      FROM persons p
      JOIN (
        SELECT person_id, COUNT(*) AS interactionCount
        FROM interaction_logs
        WHERE interact_at >= ? AND interact_at <= ?
        GROUP BY person_id
      ) cnt ON p.id = cnt.person_id
      LEFT JOIN (
        SELECT person_id, AVG(intimacy) AS intimacy
        FROM relationships
        GROUP BY person_id
      ) r ON p.id = r.person_id
      ORDER BY cnt.interactionCount DESC
      LIMIT 5
    `).all(yearStart, yearEnd + ' 23:59:59') as { name: string; interactionCount: number; intimacy: number }[]

    const weekdayRows = db.prepare(`
      SELECT CAST(strftime('%w', interact_at) AS INTEGER) AS weekday, COUNT(*) AS count
      FROM interaction_logs
      WHERE interact_at >= ? AND interact_at <= ?
      GROUP BY weekday
      ORDER BY weekday
    `).all(yearStart, yearEnd + ' 23:59:59') as { weekday: number; count: number }[]

    const weekdayNames = ['周日', '周一', '周二', '周三', '周四', '周五', '周六']
    const weekdayDistribution = weekdayRows.map(r => ({
      weekday: weekdayNames[r.weekday] || '未知',
      count: r.count,
    }))

    const prevYearStart = `${year - 1}-01-01`
    const prevYearEnd = `${year - 1}-12-31`
    const prevYearMonthly = db.prepare(`
      SELECT strftime('%m', interact_at) AS month, COUNT(*) AS count
      FROM interaction_logs
      WHERE interact_at >= ? AND interact_at <= ?
      GROUP BY month
      ORDER BY month
    `).all(prevYearStart, prevYearEnd + ' 23:59:59') as { month: string; count: number }[]
    const prevYearMap = new Map(prevYearMonthly.map(r => [r.month, r.count]))

    const monthlyComparison = monthlyData.map(m => {
      const monthOnly = m.month.split('-')[1]
      return {
        month: monthOnly,
        currentYear: m.count,
        lastYear: prevYearMap.get(monthOnly) || 0,
      }
    })

    const groupDistRows = db.prepare(`
      SELECT COALESCE(g.name, '未分组') AS name, COUNT(*) AS count
      FROM persons p
      LEFT JOIN group_members gm ON p.id = gm.person_id
      LEFT JOIN groups g ON gm.group_id = g.id
      WHERE p.is_archived = 0
      GROUP BY g.name
      ORDER BY count DESC
    `).all() as { name: string; count: number }[]

    return {
      success: true,
      data: {
        year,
        summary: {
          totalPersons: personCount.c,
          newPersons: newPersonCount.c,
          totalEvents: eventCount.c,
          totalDiaries: diaryCount.c,
          totalInteractions: interactionCount.c,
          totalPhotos: photoCount.c,
          totalRelationships: relationshipCount.c,
          newRelationshipsThisYear: newRelationshipCount.c,
          avgIntimacy: Math.round(avgIntimacyRow.avg),
        },
        highlights: {
          topContact: topContactRow
            ? { name: topContactRow.name, intimacy: topContactRow.intimacy, interactionCount: topContactRow.interactionCount }
            : null,
          mostImproved: mostImproved && mostImproved.intimacyEnd > mostImproved.intimacyStart
            ? mostImproved
            : null,
          mostActiveMonth,
          longestFriendship: {
            name: oldestPerson?.name ?? '无',
            years: longestFriendshipYears,
          },
          bestFriend: bestFriendRow ?? { name: '无', totalInteractions: 0 },
          mostPurposeful: mostPurposefulRow ?? null,
        },
        streaks: {
          longestStreak: { days: longestStreak, endDate: streakEnd || '' },
          currentStreak,
        },
        trends: {
          monthlyInteractions: monthlyData,
          intimacyGrowth,
          interactionTypeBreakdown: typeBreakdown,
          topContacts: topContactsRows,
          weekdayDistribution,
          monthlyComparison,
          groupDistribution: groupDistRows,
        },
      },
    }
  } catch (e) {
    return { success: false, error: (e as Error).message }
  }
}
