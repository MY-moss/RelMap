import { randomUUID } from 'node:crypto'
import { getDb } from '../connection'
import type { Result, FollowUpQueue, CreateFollowUpDto, UpdateFollowUpDto, FollowUpFilter } from '../../../shared/types'

export function createFollowUp(data: CreateFollowUpDto): Result<FollowUpQueue> {
  try {
    const db = getDb()
    const id = randomUUID()
    const now = new Date().toISOString()

    db.prepare(`
      INSERT INTO follow_up_queue (id, person_id, follow_up_type, priority, status, next_follow_up_date, note, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      id,
      data.person_id,
      data.follow_up_type ?? 'call',
      data.priority ?? 'medium',
      'pending',
      data.next_follow_up_date,
      data.note ?? null,
      now,
      now,
    )

    const item = db.prepare('SELECT * FROM follow_up_queue WHERE id = ?').get(id) as FollowUpQueue
    return { success: true, data: item }
  } catch (e) {
    return { success: false, error: (e as Error).message }
  }
}

export function updateFollowUp(id: string, data: UpdateFollowUpDto): Result<FollowUpQueue> {
  try {
    const db = getDb()
    const existing = db.prepare('SELECT * FROM follow_up_queue WHERE id = ?').get(id) as FollowUpQueue | undefined
    if (!existing) {
      return { success: false, error: `跟进任务不存在: ${id}` }
    }

    const fields: string[] = []
    const params: unknown[] = []

    if (data.follow_up_type !== undefined) {
      fields.push('follow_up_type = ?')
      params.push(data.follow_up_type)
    }
    if (data.priority !== undefined) {
      fields.push('priority = ?')
      params.push(data.priority)
    }
    if (data.status !== undefined) {
      fields.push('status = ?')
      params.push(data.status)
    }
    if (data.next_follow_up_date !== undefined) {
      fields.push('next_follow_up_date = ?')
      params.push(data.next_follow_up_date)
    }
    if (data.note !== undefined) {
      fields.push('note = ?')
      params.push(data.note)
    }

    if (fields.length === 0) {
      return { success: true, data: existing }
    }

    fields.push('updated_at = ?')
    params.push(new Date().toISOString())
    params.push(id)

    db.prepare(`UPDATE follow_up_queue SET ${fields.join(', ')} WHERE id = ?`).run(...params)

    const updated = db.prepare('SELECT * FROM follow_up_queue WHERE id = ?').get(id) as FollowUpQueue
    return { success: true, data: updated }
  } catch (e) {
    return { success: false, error: (e as Error).message }
  }
}

export function deleteFollowUp(id: string): Result<void> {
  try {
    const db = getDb()
    const result = db.prepare('DELETE FROM follow_up_queue WHERE id = ?').run(id)
    if (result.changes === 0) {
      return { success: false, error: `跟进任务不存在: ${id}` }
    }
    return { success: true, data: undefined }
  } catch (e) {
    return { success: false, error: (e as Error).message }
  }
}

export function getFollowUpById(id: string): Result<FollowUpQueue> {
  try {
    const db = getDb()
    const item = db.prepare(`
      SELECT f.*, p.name as person_name
      FROM follow_up_queue f
      LEFT JOIN persons p ON f.person_id = p.id
      WHERE f.id = ?
    `).get(id) as (FollowUpQueue & { person_name: string | null }) | undefined

    if (!item) {
      return { success: false, error: `跟进任务不存在: ${id}` }
    }

    const { person_name, ...rest } = item
    return {
      success: true,
      data: {
        ...rest,
        person_name: person_name ?? undefined,
      } as FollowUpQueue,
    }
  } catch (e) {
    return { success: false, error: (e as Error).message }
  }
}

export function listFollowUp(filter?: FollowUpFilter): Result<FollowUpQueue[]> {
  try {
    const db = getDb()
    const conditions: string[] = []
    const params: unknown[] = []

    if (filter?.person_id !== undefined) {
      conditions.push('f.person_id = ?')
      params.push(filter.person_id)
    }
    if (filter?.status !== undefined) {
      conditions.push('f.status = ?')
      params.push(filter.status)
    }
    if (filter?.priority !== undefined) {
      conditions.push('f.priority = ?')
      params.push(filter.priority)
    }
    if (filter?.follow_up_type !== undefined) {
      conditions.push('f.follow_up_type = ?')
      params.push(filter.follow_up_type)
    }
    if (filter?.start_date !== undefined) {
      conditions.push('f.next_follow_up_date >= ?')
      params.push(filter.start_date)
    }
    if (filter?.end_date !== undefined) {
      conditions.push('f.next_follow_up_date <= ?')
      params.push(filter.end_date)
    }

    let sql = `
      SELECT f.*, p.name as person_name
      FROM follow_up_queue f
      LEFT JOIN persons p ON f.person_id = p.id
    `

    if (conditions.length > 0) {
      sql += ' WHERE ' + conditions.join(' AND ')
    }

    const sortBy = filter?.sort_by ?? 'next_follow_up_date'
    const sortOrder = filter?.sort_order ?? 'asc'
    const priorityOrder = "CASE f.priority WHEN 'high' THEN 1 WHEN 'medium' THEN 2 WHEN 'low' THEN 3 END"

    if (sortBy === 'priority') {
      sql += ` ORDER BY ${priorityOrder} ${sortOrder.toUpperCase()}, f.next_follow_up_date ASC`
    } else {
      sql += ` ORDER BY f.next_follow_up_date ${sortOrder.toUpperCase()}`
    }

    const rows = db.prepare(sql).all(...params) as (FollowUpQueue & { person_name: string | null })[]

    const items = rows.map((row) => {
      const { person_name, ...rest } = row
      return {
        ...rest,
        person_name: person_name ?? undefined,
      } as FollowUpQueue
    })

    return { success: true, data: items }
  } catch (e) {
    return { success: false, error: (e as Error).message }
  }
}