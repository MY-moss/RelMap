import { getDb } from '../db/connection'
import type { Result, Person } from '../../shared/types'

interface PersonWithDates extends Person {
  last_interaction?: string | null
  last_event?: string | null
  last_diary?: string | null
}

/**
 * 断联检测：查询超过指定月数未联系的人员
 *
 * 综合最近联系日期 = MAX(interaction_logs.interact_at, events.event_date, diaries.diary_date)
 * - 如果最近联系日期距今超过 N 个月（months * 30 天），则视为断联
 * - 从未有过任何交互记录的联系人，如果创建时间超过 N 个月，也算断联
 *
 * @param months 断联阈值（月数，按 30 天/月 换算）
 * @returns 断联联系人列表，包含 person 信息、最近联系日期、断联天数
 */
export function detectLostContacts(
  months: number
): Result<Array<{ person: Person; last_interaction: string | null; days_since: number }>> {
  try {
    const db = getDb()

    // 使用 LEFT JOIN 替代相关子查询（性能优化）
    const rows = db.prepare(`
      SELECT p.*,
        il.last_interaction,
        ev.last_event,
        di.last_diary
      FROM persons p
      LEFT JOIN (SELECT person_id, MAX(interact_at) AS last_interaction FROM interaction_logs GROUP BY person_id) il ON il.person_id = p.id
      LEFT JOIN (SELECT ep.person_id, MAX(e.event_date) AS last_event FROM events e JOIN event_persons ep ON e.id = ep.event_id GROUP BY ep.person_id) ev ON ev.person_id = p.id
      LEFT JOIN (SELECT dp.person_id, MAX(d.diary_date) AS last_diary FROM diaries d JOIN diary_persons dp ON d.id = dp.diary_id GROUP BY dp.person_id) di ON di.person_id = p.id
      WHERE p.is_archived = 0
    `).all() as PersonWithDates[]

    const now = new Date()
    now.setHours(0, 0, 0, 0)

    const thresholdDays = months * 30
    const msPerDay = 1000 * 60 * 60 * 24

    const lostContacts: Array<{ person: Person; last_interaction: string | null; days_since: number }> = []

    for (const row of rows) {
      // 综合最近联系日期 = MAX(interaction_logs.interact_at, events.event_date, diaries.diary_date)
      const candidates: string[] = []
      if (row.last_interaction) candidates.push(row.last_interaction)
      if (row.last_event) candidates.push(row.last_event)
      if (row.last_diary) candidates.push(row.last_diary)

      // 清理 Person 类型中多余的临时字段
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const { last_interaction, last_event, last_diary, ...person } = row

      let lastContactStr: string | null
      if (candidates.length > 0) {
        // 取三个日期中的最大值
        lastContactStr = candidates.reduce((max, cur) => (cur > max ? cur : max))
      } else {
        // 从未有过任何交互记录，使用创建时间作为参考
        lastContactStr = person.created_at
      }

      const lastContactDate = new Date(lastContactStr)
      if (Number.isNaN(lastContactDate.getTime())) {
        continue
      }

      lastContactDate.setHours(0, 0, 0, 0)
      const daysSince = Math.floor((now.getTime() - lastContactDate.getTime()) / msPerDay)

      if (daysSince > thresholdDays) {
        // 如果有真实交互记录，返回真实日期；否则返回 null（表示从未交互过）
        const displayDate = candidates.length > 0 ? lastContactStr : null
        lostContacts.push({
          person,
          last_interaction: displayDate,
          days_since: daysSince,
        })
      }
    }

    // 按断联天数降序排序（断联越久越靠前）
    lostContacts.sort((a, b) => b.days_since - a.days_since)

    return { success: true, data: lostContacts }
  } catch (e) {
    return { success: false, error: (e as Error).message }
  }
}
