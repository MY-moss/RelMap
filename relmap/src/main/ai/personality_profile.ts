import { getDb } from '../db/connection'
import type { Result, PersonalityProfile, InteractionLog } from '../../shared/types'

interface DiaryWithMood {
  id: string
  mood: number | null
  diary_date: string
}

interface EventWithPerson {
  id: string
  event_date: string
}

export function buildPersonalityProfile(personId: string): Result<PersonalityProfile> {
  try {
    const db = getDb()

    const interactions = db
      .prepare('SELECT * FROM interaction_logs WHERE person_id = ? ORDER BY interact_at ASC')
      .all(personId) as InteractionLog[]

    const diaries = db
      .prepare(`
        SELECT d.id, d.mood, d.diary_date
        FROM diaries d
        JOIN diary_persons dp ON d.id = dp.diary_id
        WHERE dp.person_id = ?
        ORDER BY d.diary_date ASC
      `)
      .all(personId) as DiaryWithMood[]

    const events = db
      .prepare(`
        SELECT e.id, e.event_date
        FROM events e
        JOIN event_persons ep ON e.id = ep.event_id
        WHERE ep.person_id = ?
      `)
      .all(personId) as EventWithPerson[]

    const purposes: string[] = interactions
      .map((i) => i.purpose)
      .filter((p): p is string => !!p && p.trim().length > 0)

    const purposeCounts = new Map<string, number>()
    for (const p of purposes) {
      purposeCounts.set(p, (purposeCounts.get(p) || 0) + 1)
    }
    const purposeDistribution = Array.from(purposeCounts.entries())
      .map(([purpose, count]) => ({ purpose, count }))
      .sort((a, b) => b.count - a.count)

    const dominantPurpose = purposeDistribution.length > 0 ? purposeDistribution[0].purpose : '无记录'

    const moods = diaries
      .map((d) => d.mood)
      .filter((m): m is number => m !== null && m !== undefined)

    const emotionalTone = moods.length > 0
      ? Math.round((moods.reduce((sum, m) => sum + m, 0) / moods.length) * 10) / 10
      : 0

    const interactionStyle: Record<string, number> = {
      call: 0,
      meet: 0,
      message: 0,
      social: 0,
      other: 0,
    }
    for (const i of interactions) {
      if (interactionStyle[i.interact_type] !== undefined) {
        interactionStyle[i.interact_type]++
      }
    }

    const totalInteractions = interactions.length
    const eventCount = events.length
    const diaryCount = diaries.length
    const relationshipDepth = Math.min(eventCount * 10 + diaryCount * 15, 100)

    const sentimentTrend = moods.length > 0
      ? diaries
          .filter((d) => d.mood !== null && d.mood !== undefined)
          .map((d) => ({
            date: d.diary_date,
            score: d.mood!,
          }))
      : []

    const profile: PersonalityProfile = {
      dominantPurpose,
      emotionalTone,
      interactionStyle,
      relationshipDepth,
      totalInteractions,
      purposeDistribution,
      sentimentTrend,
    }

    return { success: true, data: profile }
  } catch (e) {
    return { success: false, error: (e as Error).message }
  }
}
