import { getDb } from '../db/connection'
import type { Result, SuggestionItem, Person } from '../../shared/types'

export function generateSuggestions(personId: string): Result<SuggestionItem[]> {
  try {
    const db = getDb()
    const suggestions: SuggestionItem[] = []

    const person = db.prepare('SELECT * FROM persons WHERE id = ?').get(personId) as Person | undefined
    if (!person) {
      return { success: false, error: '联系人不存在' }
    }

    const lifecycleStage = person.lifecycle_stage || 'new'
    if (lifecycleStage === 'dormant' || lifecycleStage === 'lost') {
      suggestions.push({
        type: 'warning',
        message: '此联系人已疏远，建议发送一条问候消息',
        actionLabel: '发送问候',
      })
    }

    const lastInteractionRow = db
      .prepare('SELECT MAX(interact_at) AS last_date FROM interaction_logs WHERE person_id = ?')
      .get(personId) as { last_date: string | null } | undefined
    const lastDateStr = lastInteractionRow?.last_date ?? null
    const daysSinceLastContact = lastDateStr
      ? Math.floor((Date.now() - new Date(lastDateStr).getTime()) / (1000 * 60 * 60 * 24))
      : 999

    if (lifecycleStage !== 'dormant' && lifecycleStage !== 'lost') {
      const intimacyRow = db
        .prepare(`
          SELECT COUNT(*) AS interaction_count,
                 MAX(interact_at) AS last_date
          FROM interaction_logs WHERE person_id = ?
        `)
        .get(personId) as { interaction_count: number; last_date: string | null }

      const eventCount = (
        db.prepare('SELECT COUNT(*) AS cnt FROM event_persons WHERE person_id = ?').get(personId) as { cnt: number }
      ).cnt
      const diaryCount = (
        db.prepare('SELECT COUNT(*) AS cnt FROM diary_persons WHERE person_id = ?').get(personId) as { cnt: number }
      ).cnt
      const manualRow = db
        .prepare('SELECT MAX(intimacy) AS max_intimacy FROM relationships WHERE person_id = ? OR related_person_id = ?')
        .get(personId, personId) as { max_intimacy: number | null } | undefined
      const manualIntimacy = manualRow?.max_intimacy ?? 50
      const depth = Math.min(eventCount * 10 + diaryCount * 15, 100)
      const intimacy = Math.round(
        0.25 * Math.min(intimacyRow.interaction_count * 3, 100) +
        0.30 * (daysSinceLastContact <= 7 ? 100 : daysSinceLastContact <= 30 ? 80 : daysSinceLastContact <= 90 ? 60 : daysSinceLastContact <= 180 ? 30 : 10) +
        0.20 * depth +
        0.25 * manualIntimacy
      )

      if (intimacy < 30 && daysSinceLastContact > 60) {
        suggestions.push({
          type: 'warning',
          message: '亲密度较低且长时间未联系，建议约见面或电话',
          actionLabel: '记录联系',
        })
      }
    }

    const now = new Date()
    const upcomingReminders = db
      .prepare(`
        SELECT * FROM reminders
        WHERE person_id = ? AND is_active = 1 AND (
          (repeat_type = 'yearly' AND substr(remind_date, 6) >= ?) OR
          (repeat_type = 'once' AND remind_date >= date('now','localtime') AND remind_date <= date('now','localtime','+30 days'))
        )
        ORDER BY remind_date ASC
      `)
      .all(personId, now.toISOString().slice(5, 10)) as { title: string; remind_date: string }[]

    for (const reminder of upcomingReminders) {
      if (reminder.title.includes('生日') || reminder.title.includes('纪念日')) {
        suggestions.push({
          type: 'tip',
          message: '生日将至，准备一份祝福',
          actionLabel: '查看提醒',
        })
      }
    }

    if (daysSinceLastContact >= 7 && daysSinceLastContact < 60) {
      suggestions.push({
        type: 'info',
        message: '联系频率下降，建议保持互动',
        actionLabel: '记录联系',
      })
    }

    return { success: true, data: suggestions }
  } catch (e) {
    return { success: false, error: (e as Error).message }
  }
}
