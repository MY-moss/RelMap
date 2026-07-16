import { randomUUID } from 'node:crypto'
import { getDb } from '../connection'
import { escapeFtsQuery } from './search.repo'
import { pluginManager } from '../../plugin/plugin-manager'
import type {
  Result,
  EventItem,
  CreateEventDto,
  UpdateEventDto,
  EventFilter,
} from '../../../shared/types'

const EVENT_COLUMNS =
  'id, title, event_date, event_time, description, location, mood, created_at, updated_at'

function getEventById(id: string): EventItem | undefined {
  const db = getDb()
  return db.prepare(`SELECT ${EVENT_COLUMNS} FROM events WHERE id = ?`).get(id) as
    | EventItem
    | undefined
}

export function createEvent(data: CreateEventDto): Result<EventItem> {
  try {
    const db = getDb()
    const id = randomUUID()

    const tx = db.transaction(() => {
      db.prepare(
        `INSERT INTO events (id, title, event_date, event_time, description, location, mood)
         VALUES (?, ?, ?, ?, ?, ?, ?)`
      ).run(
        id,
        data.title,
        data.event_date,
        data.event_time ?? null,
        data.description ?? null,
        data.location ?? null,
        data.mood ?? null
      )

      if (data.person_ids && data.person_ids.length > 0) {
        const insertPerson = db.prepare(
          `INSERT INTO event_persons (event_id, person_id) VALUES (?, ?)`
        )
        for (const personId of data.person_ids) {
          insertPerson.run(id, personId)
        }
      }
    })
    tx()

    const event = getEventById(id)
    if (!event) {
      return { success: false, error: '创建事件后查询失败' }
    }
    pluginManager.emitEvent('event:created', event).catch(() => {})
    return { success: true, data: event }
  } catch (e) {
    return { success: false, error: (e as Error).message }
  }
}

export function updateEvent(id: string, data: UpdateEventDto): Result<EventItem> {
  try {
    const db = getDb()

    const existing = db.prepare('SELECT id FROM events WHERE id = ?').get(id)
    if (!existing) {
      return { success: false, error: `事件 ${id} 不存在` }
    }

    const tx = db.transaction(() => {
      const fields: string[] = []
      const values: unknown[] = []

      if (data.title !== undefined) {
        fields.push('title = ?')
        values.push(data.title)
      }
      if (data.event_date !== undefined) {
        fields.push('event_date = ?')
        values.push(data.event_date)
      }
      if (data.event_time !== undefined) {
        fields.push('event_time = ?')
        values.push(data.event_time)
      }
      if (data.description !== undefined) {
        fields.push('description = ?')
        values.push(data.description)
      }
      if (data.location !== undefined) {
        fields.push('location = ?')
        values.push(data.location)
      }
      if (data.mood !== undefined) {
        fields.push('mood = ?')
        values.push(data.mood)
      }

      if (fields.length > 0) {
        fields.push("updated_at = datetime('now','localtime')")
        values.push(id)
        db.prepare(`UPDATE events SET ${fields.join(', ')} WHERE id = ?`).run(...values)
      }

      if (data.person_ids !== undefined) {
        db.prepare('DELETE FROM event_persons WHERE event_id = ?').run(id)
        if (data.person_ids.length > 0) {
          const insertPerson = db.prepare(
            `INSERT INTO event_persons (event_id, person_id) VALUES (?, ?)`
          )
          for (const personId of data.person_ids) {
            insertPerson.run(id, personId)
          }
        }
      }
    })
    tx()

    const event = getEventById(id)
    if (!event) {
      return { success: false, error: '更新事件后查询失败' }
    }
    pluginManager.emitEvent('event:updated', event).catch(() => {})
    return { success: true, data: event }
  } catch (e) {
    return { success: false, error: (e as Error).message }
  }
}

export function deleteEvent(id: string): Result<void> {
  try {
    const db = getDb()
    const result = db.prepare('DELETE FROM events WHERE id = ?').run(id)
    if (result.changes === 0) {
      return { success: false, error: `事件 ${id} 不存在` }
    }
    pluginManager.emitEvent('event:deleted', { id }).catch(() => {})
    return { success: true, data: undefined }
  } catch (e) {
    return { success: false, error: (e as Error).message }
  }
}

export function listEvents(filter?: EventFilter): Result<EventItem[]> {
  try {
    const db = getDb()

    // MED-013: 构建查询的逻辑抽离，支持 FTS5 与 LIKE 两种关键词匹配方式
    const buildQuery = (useFts: boolean) => {
      const conditions: string[] = []
      const params: unknown[] = []

      if (filter?.person_id) {
        conditions.push('id IN (SELECT event_id FROM event_persons WHERE person_id = ?)')
        params.push(filter.person_id)
      }
      if (filter?.start_date) {
        conditions.push('event_date >= ?')
        params.push(filter.start_date)
      }
      if (filter?.end_date) {
        conditions.push('event_date <= ?')
        params.push(filter.end_date)
      }
      if (filter?.keyword) {
        if (useFts) {
          conditions.push('id IN (SELECT rowid FROM events_fts WHERE events_fts MATCH ?)')
          params.push(escapeFtsQuery(filter.keyword))
        } else {
          // FTS5 不可用时回退到 LIKE 全表扫描（覆盖 title/description/location 三个索引列）
          conditions.push(
            "(title LIKE '%' || ? || '%' OR COALESCE(description, '') LIKE '%' || ? || '%' OR COALESCE(location, '') LIKE '%' || ? || '%')"
          )
          params.push(filter.keyword, filter.keyword, filter.keyword)
        }
      }

      let sql = `SELECT ${EVENT_COLUMNS} FROM events`
      if (conditions.length > 0) {
        sql += ' WHERE ' + conditions.join(' AND ')
      }
      sql += ' ORDER BY event_date DESC, event_time DESC'
      return { sql, params }
    }

    // 优先使用 FTS5 全文检索；若 FTS5 查询出错则回退到 LIKE
    let events: EventItem[]
    try {
      const { sql, params } = buildQuery(true)
      events = db.prepare(sql).all(...params) as EventItem[]
    } catch {
      const { sql, params } = buildQuery(false)
      events = db.prepare(sql).all(...params) as EventItem[]
    }

    return { success: true, data: events }
  } catch (e) {
    return { success: false, error: (e as Error).message }
  }
}
