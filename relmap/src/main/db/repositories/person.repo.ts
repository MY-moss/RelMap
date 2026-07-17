import { randomUUID } from 'node:crypto'
import { getDb } from '../connection'
import { escapeFtsQuery } from './search.repo'
import { pluginManager } from '../../plugin/plugin-manager'
import type {
  Result,
  Person,
  CreatePersonDto,
  UpdatePersonDto,
  PersonFilter,
} from '../../../shared/types'

export type { CreatePersonDto, UpdatePersonDto }

export function createPerson(data: CreatePersonDto): Result<Person> {
  try {
    const db = getDb()
    const id = randomUUID()
    db.prepare(`
      INSERT INTO persons (id, name, nickname, birthday, gender, company, title, department, notes, home_address)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      id,
      data.name,
      data.nickname ?? null,
      data.birthday ?? null,
      data.gender ?? 0,
      data.company ?? null,
      data.title ?? null,
      data.department ?? null,
      data.notes ?? null,
      data.home_address ?? null,
    )
    const result = computeLifecycleStage(id)
    if (result.success) {
      pluginManager.emitEvent('person:created', result.data).catch(() => {})
    }
    return result
  } catch (e) {
    return { success: false, error: (e as Error).message }
  }
}

export function computeLifecycleStage(personId: string): Result<Person> {
  try {
    const db = getDb()
    const person = db.prepare('SELECT * FROM persons WHERE id = ?').get(personId) as Person | undefined
    if (!person) {
      return { success: false, error: `Person not found: ${personId}` }
    }

    let stage: string

    if (person.is_archived) {
      stage = 'archived'
    } else {
      const createdDate = new Date(person.created_at)
      const now = new Date()
      const daysSinceCreated = Math.floor((now.getTime() - createdDate.getTime()) / (1000 * 60 * 60 * 24))

      if (daysSinceCreated < 30) {
        stage = 'new'
      } else {
        const lastInteraction = db.prepare(
          'SELECT MAX(interact_at) as last_date FROM interaction_logs WHERE person_id = ?'
        ).get(personId) as { last_date: string | null }

        if (lastInteraction?.last_date) {
          const lastDate = new Date(lastInteraction.last_date)
          const daysSinceLast = Math.floor((now.getTime() - lastDate.getTime()) / (1000 * 60 * 60 * 24))

          if (daysSinceLast <= 14) {
            stage = 'active'
          } else if (daysSinceLast <= 30) {
            stage = 'maintain'
          } else if (daysSinceLast <= 90) {
            stage = 'dormant'
          } else {
            stage = 'lost'
          }
        } else {
          stage = 'dormant'
        }
      }
    }

    db.prepare("UPDATE persons SET lifecycle_stage = ?, updated_at = datetime('now','localtime') WHERE id = ?").run(stage, personId)
    const updated = db.prepare('SELECT * FROM persons WHERE id = ?').get(personId) as Person
    return { success: true, data: updated }
  } catch (e) {
    return { success: false, error: (e as Error).message }
  }
}

export function updatePerson(id: string, data: UpdatePersonDto): Result<Person> {
  try {
    const db = getDb()
    const existing = db.prepare('SELECT * FROM persons WHERE id = ?').get(id) as Person | undefined
    if (!existing) {
      return { success: false, error: `Person not found: ${id}` }
    }

    const fields: string[] = []
    const params: unknown[] = []

    if (data.name !== undefined) { fields.push('name = ?'); params.push(data.name) }
    if (data.nickname !== undefined) { fields.push('nickname = ?'); params.push(data.nickname) }
    if (data.birthday !== undefined) { fields.push('birthday = ?'); params.push(data.birthday) }
    if (data.gender !== undefined) { fields.push('gender = ?'); params.push(data.gender) }
    if (data.company !== undefined) { fields.push('company = ?'); params.push(data.company) }
    if (data.title !== undefined) { fields.push('title = ?'); params.push(data.title) }
    if (data.department !== undefined) { fields.push('department = ?'); params.push(data.department) }
    if (data.notes !== undefined) { fields.push('notes = ?'); params.push(data.notes) }
    if (data.home_address !== undefined) { fields.push('home_address = ?'); params.push(data.home_address) }
    if (data.avatar_path !== undefined) { fields.push('avatar_path = ?'); params.push(data.avatar_path) }

    if (fields.length === 0) {
      return { success: true, data: existing }
    }

    fields.push("updated_at = datetime('now','localtime')")
    params.push(id)

    db.prepare(`UPDATE persons SET ${fields.join(', ')} WHERE id = ?`).run(...params)

    const result = computeLifecycleStage(id)
    if (result.success) {
      pluginManager.emitEvent('person:updated', result.data).catch(() => {})
    }
    return result
  } catch (e) {
    return { success: false, error: (e as Error).message }
  }
}

export function deletePerson(id: string): Result<void> {
  try {
    const db = getDb()
    const deleteTaggings = db.prepare("DELETE FROM taggings WHERE target_id = ? AND target_type = 'person'")
    const deleteExternalIds = db.prepare("DELETE FROM external_ids WHERE target_id = ? AND target_type = 'person'")
    const deletePerson = db.prepare('DELETE FROM persons WHERE id = ?')
    const doDelete = db.transaction(() => {
      deleteTaggings.run(id)
      deleteExternalIds.run(id)
      const result = deletePerson.run(id)
      if (result.changes === 0) {
        throw new Error(`Person not found: ${id}`)
      }
    })
    doDelete()
    pluginManager.emitEvent('person:deleted', { id }).catch(() => {})
    return { success: true, data: undefined }
  } catch (e) {
    return { success: false, error: (e as Error).message }
  }
}

export function deletePersons(ids: string[]): Result<{ deleted: number }> {
  try {
    const db = getDb()
    const deleteTaggings = db.prepare("DELETE FROM taggings WHERE target_id = ? AND target_type = 'person'")
    const deleteExternalIds = db.prepare("DELETE FROM external_ids WHERE target_id = ? AND target_type = 'person'")
    const deletePerson = db.prepare('DELETE FROM persons WHERE id = ?')
    let deleted = 0
    const tx = db.transaction(() => {
      for (const id of ids) {
        deleteTaggings.run(id)
        deleteExternalIds.run(id)
        const result = deletePerson.run(id)
        if (result.changes > 0) {
          deleted++
          pluginManager.emitEvent('person:deleted', { id }).catch(() => {})
        }
      }
    })
    tx()
    return { success: true, data: { deleted } }
  } catch (e) {
    return { success: false, error: (e as Error).message }
  }
}

export function getPersonById(id: string): Result<Person> {
  try {
    const db = getDb()
    const person = db.prepare('SELECT * FROM persons WHERE id = ?').get(id) as Person | undefined
    if (!person) {
      return { success: false, error: `Person not found: ${id}` }
    }
    return { success: true, data: person }
  } catch (e) {
    return { success: false, error: (e as Error).message }
  }
}

export function listPersons(filter?: PersonFilter): Result<Person[]> {
  try {
    const db = getDb()

    const conditions: string[] = []
    const params: unknown[] = []

    // 默认不返回已归档的联系人，除非明确指定 is_archived=true
    if (filter?.is_archived === true) {
      conditions.push('p.is_archived = ?')
      params.push(1)
    } else {
      conditions.push('p.is_archived = ?')
      params.push(0)
    }

    if (filter?.is_favorite !== undefined) {
      conditions.push('p.is_favorite = ?')
      params.push(filter.is_favorite ? 1 : 0)
    }

    if (filter?.keyword) {
      // 优先使用 FTS5 全文搜索；失败时回退到 LIKE
      try {
        const matchQuery = escapeFtsQuery(filter.keyword)
        conditions.push('p.rowid IN (SELECT rowid FROM persons_fts WHERE persons_fts MATCH ?)')
        params.push(matchQuery)
      } catch {
        conditions.push('(p.name LIKE ? OR p.nickname LIKE ? OR p.company LIKE ?)')
        const kw = `%${filter.keyword}%`
        params.push(kw, kw, kw)
      }
    }

    const hasMinIntimacy = filter?.min_intimacy !== undefined
    const hasMaxIntimacy = filter?.max_intimacy !== undefined
    if (hasMinIntimacy || hasMaxIntimacy) {
      conditions.push('p.id IN (SELECT person_id FROM (SELECT person_id AS person_id, intimacy FROM relationships UNION ALL SELECT related_person_id AS person_id, intimacy FROM relationships) sub GROUP BY person_id HAVING MAX(sub.intimacy)')
      if (hasMinIntimacy) {
        conditions[conditions.length - 1] += ' >= ?'
        params.push(filter!.min_intimacy!)
      }
      if (hasMaxIntimacy) {
        conditions[conditions.length - 1] += hasMinIntimacy ? ' AND MAX(sub.intimacy) <= ?' : ' <= ?'
        params.push(filter!.max_intimacy!)
      }
      conditions[conditions.length - 1] += ')'
    }
    if (filter?.tag_id) {
      conditions.push('p.id IN (SELECT target_id FROM taggings WHERE tag_id = ? AND target_type = \'person\')')
      params.push(filter.tag_id)
    }

    const whereClause = 'WHERE ' + conditions.join(' AND ')

    let orderBy = 'ORDER BY p.is_main_identity DESC, p.created_at DESC'
    if (filter?.sort_by) {
      const order = filter.sort_order === 'asc' ? 'ASC' : 'DESC'
      if (filter.sort_by === 'name') {
        orderBy = `ORDER BY p.is_main_identity DESC, p.name ${order}`
      } else if (filter.sort_by === 'created_at') {
        orderBy = `ORDER BY p.is_main_identity DESC, p.created_at ${order}`
      } else if (filter.sort_by === 'intimacy') {
        orderBy = `ORDER BY p.is_main_identity DESC, (SELECT MAX(r.intimacy) FROM relationships r WHERE r.person_id = p.id OR r.related_person_id = p.id) ${order}`
      }
    }

    // 支持 limit/offset 分页，避免全量加载影响性能
    let limitClause = ''
    if (filter?.limit !== undefined) {
      limitClause = 'LIMIT ?'
      params.push(filter.limit)
      if (filter?.offset !== undefined) {
        limitClause += ' OFFSET ?'
        params.push(filter.offset)
      }
    }

    const sql = `SELECT p.* FROM persons p ${whereClause} ${orderBy} ${limitClause}`.trim()
    const rows = db.prepare(sql).all(...params) as Person[]
    return { success: true, data: rows }
  } catch (e) {
    return { success: false, error: (e as Error).message }
  }
}

export function setPersonMainIdentity(id: string): Result<Person> {
  try {
    const db = getDb()
    const person = db.prepare('SELECT * FROM persons WHERE id = ?').get(id) as Person | undefined
    if (!person) {
      return { success: false, error: `Person not found: ${id}` }
    }
    db.transaction(() => {
      db.prepare("UPDATE persons SET is_main_identity = 0, updated_at = datetime('now','localtime') WHERE is_main_identity = 1").run()
      db.prepare("UPDATE persons SET is_main_identity = 1, updated_at = datetime('now','localtime') WHERE id = ?").run(id)
    })()
    const updated = db.prepare('SELECT * FROM persons WHERE id = ?').get(id) as Person
    return { success: true, data: updated }
  } catch (e) {
    return { success: false, error: (e as Error).message }
  }
}

export function unsetPersonMainIdentity(id: string): Result<Person> {
  try {
    const db = getDb()
    const person = db.prepare('SELECT * FROM persons WHERE id = ?').get(id) as Person | undefined
    if (!person) {
      return { success: false, error: `Person not found: ${id}` }
    }
    db.prepare("UPDATE persons SET is_main_identity = 0, updated_at = datetime('now','localtime') WHERE id = ?").run(id)
    const updated = db.prepare('SELECT * FROM persons WHERE id = ?').get(id) as Person
    return { success: true, data: updated }
  } catch (e) {
    return { success: false, error: (e as Error).message }
  }
}

export function getMainPerson(): Result<Person | null> {
  try {
    const db = getDb()
    const person = db.prepare('SELECT * FROM persons WHERE is_main_identity = 1').get() as Person | undefined
    return { success: true, data: person || null }
  } catch (e) {
    return { success: false, error: (e as Error).message }
  }
}

export function togglePersonFavorite(id: string): Result<Person> {
  try {
    const db = getDb()
    const person = db.prepare('SELECT * FROM persons WHERE id = ?').get(id) as Person | undefined
    if (!person) {
      return { success: false, error: `Person not found: ${id}` }
    }
    db.prepare(`
      UPDATE persons SET is_favorite = ?, updated_at = datetime('now','localtime') WHERE id = ?
    `).run(person.is_favorite ? 0 : 1, id)
    const updated = db.prepare('SELECT * FROM persons WHERE id = ?').get(id) as Person
    return { success: true, data: updated }
  } catch (e) {
    return { success: false, error: (e as Error).message }
  }
}
