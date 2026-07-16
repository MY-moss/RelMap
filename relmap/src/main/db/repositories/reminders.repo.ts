import { randomUUID } from 'node:crypto'
import { getDb } from '../connection'
import type { Result, Reminder, FollowUpItem } from '../../../shared/types'

export interface CreateReminderDto {
  person_id?: string
  title: string
  remind_date: string
  repeat_type?: 'once' | 'yearly' | 'monthly'
  note?: string
}

export interface UpdateReminderDto {
  title?: string
  remind_date?: string
  repeat_type?: 'once' | 'yearly' | 'monthly'
  is_active?: 0 | 1
  note?: string
}

export interface ReminderFilter {
  person_id?: string
  is_active?: boolean
  start_date?: string
  end_date?: string
}

export function createReminder(data: CreateReminderDto): Result<Reminder> {
  try {
    const db = getDb()

    if (!data.remind_date || !/^\d{4}-\d{2}-\d{2}$/.test(data.remind_date)) {
      return { success: false, error: '提醒日期格式无效，应为 YYYY-MM-DD' }
    }
    const parsed = new Date(data.remind_date)
    if (Number.isNaN(parsed.getTime())) {
      return { success: false, error: '提醒日期不是有效日期' }
    }

    const id = randomUUID()
    const repeatType = data.repeat_type ?? 'once'

    // 如果 repeat_type 为 'yearly'，设置 remind_year 为 remind_date 的年份
    let remindYear: number | null = null
    if (repeatType === 'yearly') {
      remindYear = parseInt(data.remind_date.slice(0, 4), 10)
      if (Number.isNaN(remindYear)) {
        remindYear = null
      }
    }

    db.prepare(`
      INSERT INTO reminders (id, person_id, title, remind_date, remind_year, repeat_type, is_active, note)
      VALUES (?, ?, ?, ?, ?, ?, 1, ?)
    `).run(
      id,
      data.person_id ?? null,
      data.title,
      data.remind_date,
      remindYear,
      repeatType,
      data.note ?? null,
    )

    const reminder = db.prepare('SELECT * FROM reminders WHERE id = ?').get(id) as Reminder
    return { success: true, data: reminder }
  } catch (e) {
    return { success: false, error: (e as Error).message }
  }
}

export function updateReminder(id: string, data: UpdateReminderDto): Result<Reminder> {
  try {
    const db = getDb()
    const existing = db.prepare('SELECT * FROM reminders WHERE id = ?').get(id) as Reminder | undefined
    if (!existing) {
      return { success: false, error: `提醒不存在: ${id}` }
    }

    const fields: string[] = []
    const params: unknown[] = []

    if (data.title !== undefined) {
      fields.push('title = ?')
      params.push(data.title)
    }
    if (data.remind_date !== undefined) {
      fields.push('remind_date = ?')
      params.push(data.remind_date)
    }
    if (data.repeat_type !== undefined) {
      fields.push('repeat_type = ?')
      params.push(data.repeat_type)
      // 如果切换为 yearly，同步更新 remind_year
      if (data.repeat_type === 'yearly') {
        // 优先使用本次更新提供的 remind_date，否则回退到现有 remind_date
        const remindDate = data.remind_date ?? existing.remind_date
        if (remindDate) {
          const year = parseInt(remindDate.slice(0, 4), 10)
          if (!Number.isNaN(year)) {
            fields.push('remind_year = ?')
            params.push(year)
          }
        }
      } else {
        // 非yearly类型清空 remind_year
        fields.push('remind_year = ?')
        params.push(null)
      }
    }
    if (data.is_active !== undefined) {
      fields.push('is_active = ?')
      params.push(data.is_active)
    }
    if (data.note !== undefined) {
      fields.push('note = ?')
      params.push(data.note)
    }

    if (fields.length === 0) {
      return { success: true, data: existing }
    }

    params.push(id)
    db.prepare(`UPDATE reminders SET ${fields.join(', ')} WHERE id = ?`).run(...params)

    const updated = db.prepare('SELECT * FROM reminders WHERE id = ?').get(id) as Reminder
    return { success: true, data: updated }
  } catch (e) {
    return { success: false, error: (e as Error).message }
  }
}

export function deleteReminder(id: string): Result<void> {
  try {
    const db = getDb()
    const result = db.prepare('DELETE FROM reminders WHERE id = ?').run(id)
    if (result.changes === 0) {
      return { success: false, error: `提醒不存在: ${id}` }
    }
    return { success: true, data: undefined }
  } catch (e) {
    return { success: false, error: (e as Error).message }
  }
}

export function getReminderById(id: string): Result<Reminder> {
  try {
    const db = getDb()
    const reminder = db.prepare('SELECT * FROM reminders WHERE id = ?').get(id) as Reminder | undefined
    if (!reminder) {
      return { success: false, error: `提醒不存在: ${id}` }
    }
    return { success: true, data: reminder }
  } catch (e) {
    return { success: false, error: (e as Error).message }
  }
}

export function listReminders(filter?: ReminderFilter): Result<Reminder[]> {
  try {
    const db = getDb()
    const conditions: string[] = []
    const params: unknown[] = []

    if (filter?.person_id !== undefined) {
      conditions.push('person_id = ?')
      params.push(filter.person_id)
    }
    if (filter?.is_active !== undefined) {
      conditions.push('is_active = ?')
      params.push(filter.is_active ? 1 : 0)
    }
    if (filter?.start_date !== undefined) {
      conditions.push('remind_date >= ?')
      params.push(filter.start_date)
    }
    if (filter?.end_date !== undefined) {
      conditions.push('remind_date <= ?')
      params.push(filter.end_date)
    }

    let sql = 'SELECT * FROM reminders'
    if (conditions.length > 0) {
      sql += ' WHERE ' + conditions.join(' AND ')
    }
    sql += ' ORDER BY remind_date ASC'

    const rows = db.prepare(sql).all(...params) as Reminder[]
    return { success: true, data: rows }
  } catch (e) {
    return { success: false, error: (e as Error).message }
  }
}

/**
 * 计算提醒在指定年份的到期日期
 * - once: 直接使用 remind_date
 * - yearly: 使用 remind_date 的月日 + 当前年份
 * - monthly: 使用 remind_date 的日 + 当前年月
 */
function computeEffectiveDate(reminder: Reminder, now: Date): Date | null {
  const baseDate = new Date(reminder.remind_date + 'T00:00:00')
  if (Number.isNaN(baseDate.getTime())) {
    return null
  }

  if (reminder.repeat_type === 'once') {
    return baseDate
  }

  if (reminder.repeat_type === 'yearly') {
    // 使用 remind_date 的月日 + 当前年份
    const month = baseDate.getMonth()
    const day = baseDate.getDate()
    return new Date(now.getFullYear(), month, day)
  }

  if (reminder.repeat_type === 'monthly') {
    // 使用 remind_date 的日 + 当前年月
    const day = baseDate.getDate()
    return new Date(now.getFullYear(), now.getMonth(), day)
  }

  return baseDate
}

export function listUpcomingReminders(days: number): Result<Reminder[]> {
  try {
    const db = getDb()
    // 查询所有 active 提醒
    const reminders = db.prepare('SELECT * FROM reminders WHERE is_active = 1').all() as Reminder[]

    const now = new Date()
    now.setHours(0, 0, 0, 0) // 归一化到当天 0 点

    const startDate = new Date(now)
    const endDate = new Date(now)
    endDate.setDate(endDate.getDate() + days)

    // 在 JS 中过滤未来 N 天内到期的提醒（处理 yearly/monthly 重复）
    const upcoming = reminders.filter((reminder) => {
      const effectiveDate = computeEffectiveDate(reminder, now)
      if (!effectiveDate) {
        return false
      }
      effectiveDate.setHours(0, 0, 0, 0)
      return effectiveDate >= startDate && effectiveDate <= endDate
    })

    // 按到期日期升序排序
    upcoming.sort((a, b) => {
      const dateA = computeEffectiveDate(a, now)
      const dateB = computeEffectiveDate(b, now)
      if (!dateA || !dateB) return 0
      return dateA.getTime() - dateB.getTime()
    })

    return { success: true, data: upcoming }
  } catch (e) {
    return { success: false, error: (e as Error).message }
  }
}

export function listFollowUpReminders(): Result<FollowUpItem[]> {
  try {
    const db = getDb()
    const rows = db.prepare(`
      SELECT r.*, p.name as person_name
      FROM reminders r
      LEFT JOIN persons p ON r.person_id = p.id
      WHERE r.repeat_type = 'once' AND r.is_active = 1 AND r.remind_date <= date('now','localtime')
      ORDER BY r.remind_date ASC
    `).all() as (Reminder & { person_name: string | null })[]

    const now = new Date()
    now.setHours(0, 0, 0, 0)

    const items: FollowUpItem[] = rows.map((row) => {
      const remindDate = new Date(row.remind_date + 'T00:00:00')
      const daysOverdue = Math.floor((now.getTime() - remindDate.getTime()) / (1000 * 60 * 60 * 24))
      const { person_name, ...reminder } = row
      return {
        reminder: reminder as Reminder,
        person_name: person_name ?? undefined,
        days_overdue: daysOverdue,
      }
    })

    return { success: true, data: items }
  } catch (e) {
    return { success: false, error: (e as Error).message }
  }
}
