import { getDb } from '../connection'
import type { Result } from '../../../shared/types'

export interface MemoryCapsuleItem {
  type: 'event' | 'diary'
  id: string
  title: string
  content: string
  date: string
  year: number
}

export function getTodayMemories(): Result<MemoryCapsuleItem[]> {
  try {
    const db = getDb()
    const today = new Date()
    const monthDay = `${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`
    const currentYear = today.getFullYear()

    const events = db.prepare(`
      SELECT id, title, description, event_date
      FROM events
      WHERE strftime('%m-%d', event_date) = ?
        AND CAST(strftime('%Y', event_date) AS INTEGER) != ?
      ORDER BY event_date DESC
      LIMIT 10
    `).all(monthDay, currentYear) as { id: string; title: string; description: string | null; event_date: string }[]

    const diaries = db.prepare(`
      SELECT id, title, content, diary_date
      FROM diaries
      WHERE strftime('%m-%d', diary_date) = ?
        AND CAST(strftime('%Y', diary_date) AS INTEGER) != ?
      ORDER BY diary_date DESC
      LIMIT 10
    `).all(monthDay, currentYear) as { id: string; title: string | null; content: string; diary_date: string }[]

    const memories: MemoryCapsuleItem[] = [
      ...events.map(e => ({
        type: 'event' as const,
        id: e.id,
        title: e.title,
        content: e.description ?? '',
        date: e.event_date,
        year: new Date(e.event_date).getFullYear(),
      })),
      ...diaries.map(d => ({
        type: 'diary' as const,
        id: d.id,
        title: d.title ?? d.content.slice(0, 30),
        content: d.content,
        date: d.diary_date,
        year: new Date(d.diary_date).getFullYear(),
      })),
    ].sort((a, b) => b.date.localeCompare(a.date)).slice(0, 10)

    return { success: true, data: memories }
  } catch (e) {
    return { success: false, error: (e as Error).message }
  }
}

export function getRandomMemory(): Result<MemoryCapsuleItem> {
  try {
    const db = getDb()

    const randomEvent = db.prepare(`
      SELECT id, title, description, event_date, 'event' AS type
      FROM events
      ORDER BY RANDOM()
      LIMIT 1
    `).get() as { id: string; title: string; description: string | null; event_date: string; type: string } | undefined

    const randomDiary = db.prepare(`
      SELECT id, title, content, diary_date, 'diary' AS type
      FROM diaries
      ORDER BY RANDOM()
      LIMIT 1
    `).get() as { id: string; title: string | null; content: string; diary_date: string; type: string } | undefined

    const pick = Math.random() < 0.5 ? randomEvent : randomDiary
    if (!pick) {
      return { success: false, error: '暂无记忆数据' }
    }

    if (pick.type === 'event') {
      const e = pick as typeof randomEvent
      return {
        success: true,
        data: {
          type: 'event',
          id: e!.id,
          title: e!.title,
          content: e!.description ?? '',
          date: e!.event_date,
          year: new Date(e!.event_date).getFullYear(),
        },
      }
    } else {
      const d = pick as typeof randomDiary
      return {
        success: true,
        data: {
          type: 'diary',
          id: d!.id,
          title: d!.title ?? d!.content.slice(0, 30),
          content: d!.content,
          date: d!.diary_date,
          year: new Date(d!.diary_date).getFullYear(),
        },
      }
    }
  } catch (e) {
    return { success: false, error: (e as Error).message }
  }
}
