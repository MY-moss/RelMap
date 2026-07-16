import { randomUUID } from 'node:crypto'
import { getDb } from '../connection'
import type { Result, InteractionLog } from '../../../shared/types'

export interface CreateInteractionLogDto {
  person_id: string
  interact_at: string
  interact_type: 'call' | 'meet' | 'message' | 'social' | 'other'
  summary?: string
  duration?: number
  purpose?: string
}

export interface UpdateInteractionLogDto {
  interact_at?: string
  interact_type?: 'call' | 'meet' | 'message' | 'social' | 'other'
  summary?: string
  duration?: number
  purpose?: string
}

export interface InteractionLogFilter {
  person_id?: string
  interact_type?: string
  start_date?: string
  end_date?: string
}

export function createInteractionLog(data: CreateInteractionLogDto): Result<InteractionLog> {
  try {
    const db = getDb()

    const person = db.prepare('SELECT id FROM persons WHERE id = ?').get(data.person_id)
    if (!person) {
      return { success: false, error: `联系人 ${data.person_id} 不存在` }
    }

    const id = randomUUID()

    db.prepare(`
      INSERT INTO interaction_logs (id, person_id, interact_at, interact_type, summary, duration, purpose)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).run(
      id,
      data.person_id,
      data.interact_at,
      data.interact_type,
      data.summary ?? null,
      data.duration ?? null,
      data.purpose ?? null,
    )

    const log = db.prepare('SELECT * FROM interaction_logs WHERE id = ?').get(id) as InteractionLog
    return { success: true, data: log }
  } catch (e) {
    return { success: false, error: (e as Error).message }
  }
}

export function updateInteractionLog(
  id: string,
  data: UpdateInteractionLogDto
): Result<InteractionLog> {
  try {
    const db = getDb()
    const existing = db.prepare('SELECT id FROM interaction_logs WHERE id = ?').get(id)
    if (!existing) {
      return { success: false, error: `交互日志不存在: ${id}` }
    }

    const fields: string[] = []
    const params: unknown[] = []

    if (data.interact_at !== undefined) {
      fields.push('interact_at = ?')
      params.push(data.interact_at)
    }
    if (data.interact_type !== undefined) {
      fields.push('interact_type = ?')
      params.push(data.interact_type)
    }
    if (data.summary !== undefined) {
      fields.push('summary = ?')
      params.push(data.summary)
    }
    if (data.duration !== undefined) {
      fields.push('duration = ?')
      params.push(data.duration)
    }
    if (data.purpose !== undefined) {
      fields.push('purpose = ?')
      params.push(data.purpose)
    }

    if (fields.length === 0) {
      const log = db.prepare('SELECT * FROM interaction_logs WHERE id = ?').get(id) as InteractionLog
      return { success: true, data: log }
    }

    params.push(id)
    db.prepare(`UPDATE interaction_logs SET ${fields.join(', ')} WHERE id = ?`).run(...params)

    const updated = db.prepare('SELECT * FROM interaction_logs WHERE id = ?').get(id) as InteractionLog
    return { success: true, data: updated }
  } catch (e) {
    return { success: false, error: (e as Error).message }
  }
}

export function deleteInteractionLog(id: string): Result<void> {
  try {
    const db = getDb()
    const result = db.prepare('DELETE FROM interaction_logs WHERE id = ?').run(id)
    if (result.changes === 0) {
      return { success: false, error: `交互日志不存在: ${id}` }
    }
    return { success: true, data: undefined }
  } catch (e) {
    return { success: false, error: (e as Error).message }
  }
}

export function listInteractionLogs(filter?: InteractionLogFilter): Result<InteractionLog[]> {
  try {
    const db = getDb()
    const conditions: string[] = []
    const params: unknown[] = []

    if (filter?.person_id !== undefined) {
      conditions.push('person_id = ?')
      params.push(filter.person_id)
    }
    if (filter?.interact_type !== undefined) {
      conditions.push('interact_type = ?')
      params.push(filter.interact_type)
    }
    if (filter?.start_date !== undefined) {
      conditions.push('interact_at >= ?')
      params.push(filter.start_date)
    }
    if (filter?.end_date !== undefined) {
      conditions.push('interact_at <= ?')
      params.push(filter.end_date)
    }

    let sql = 'SELECT * FROM interaction_logs'
    if (conditions.length > 0) {
      sql += ' WHERE ' + conditions.join(' AND ')
    }
    sql += ' ORDER BY interact_at DESC'

    const rows = db.prepare(sql).all(...params) as InteractionLog[]
    return { success: true, data: rows }
  } catch (e) {
    return { success: false, error: (e as Error).message }
  }
}

export function listInteractionLogsByPerson(
  personId: string,
  limit: number = 50
): Result<InteractionLog[]> {
  try {
    const db = getDb()
    const rows = db.prepare(`
      SELECT * FROM interaction_logs
      WHERE person_id = ?
      ORDER BY interact_at DESC
      LIMIT ?
    `).all(personId, limit) as InteractionLog[]
    return { success: true, data: rows }
  } catch (e) {
    return { success: false, error: (e as Error).message }
  }
}

export function getLastInteractionDate(personId: string): Result<string | null> {
  try {
    const db = getDb()
    const row = db.prepare(`
      SELECT MAX(interact_at) as last_date FROM interaction_logs WHERE person_id = ?
    `).get(personId) as { last_date: string | null } | undefined
    return { success: true, data: row?.last_date ?? null }
  } catch (e) {
    return { success: false, error: (e as Error).message }
  }
}
