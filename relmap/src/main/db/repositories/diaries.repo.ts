import { randomUUID } from 'node:crypto'
import { getDb } from '../connection'
import { escapeFtsQuery } from './search.repo'
import { pluginManager } from '../../plugin/plugin-manager'
import type { Result, Diary, CreateDiaryDto, UpdateDiaryDto, DiaryFilter } from '../../../shared/types'

export function createDiary(data: CreateDiaryDto): Result<Diary> {
  const id = randomUUID()

  try {
    const db = getDb()
    const tx = db.transaction(() => {
      db.prepare(`
        INSERT INTO diaries (id, title, content, mood, weather, diary_date)
        VALUES (?, ?, ?, ?, ?, ?)
      `).run(id, data.title ?? null, data.content, data.mood ?? null, data.weather ?? null, data.diary_date)

      if (data.person_ids && data.person_ids.length > 0) {
        const stmt = db.prepare(`INSERT INTO diary_persons (diary_id, person_id) VALUES (?, ?)`)
        for (const personId of data.person_ids) {
          stmt.run(id, personId)
        }
      }
    })
    tx()

    const diary = db.prepare(`SELECT * FROM diaries WHERE id = ?`).get(id) as Diary
    pluginManager.emitEvent('diary:saved', diary).catch(() => {})
    return { success: true, data: diary }
  } catch (e) {
    return { success: false, error: (e as Error).message }
  }
}

export function updateDiary(id: string, data: UpdateDiaryDto): Result<Diary> {
  try {
    const db = getDb()
    const existing = db.prepare(`SELECT id FROM diaries WHERE id = ?`).get(id)
    if (!existing) {
      return { success: false, error: '日记不存在' }
    }

    const tx = db.transaction(() => {
      const fields: string[] = []
      const values: (string | number | null)[] = []

      if (data.title !== undefined) {
        fields.push('title = ?')
        values.push(data.title)
      }
      if (data.content !== undefined) {
        fields.push('content = ?')
        values.push(data.content)
      }
      if (data.mood !== undefined) {
        fields.push('mood = ?')
        values.push(data.mood)
      }
      if (data.weather !== undefined) {
        fields.push('weather = ?')
        values.push(data.weather)
      }
      if (data.diary_date !== undefined) {
        fields.push('diary_date = ?')
        values.push(data.diary_date)
      }

      if (fields.length > 0) {
        fields.push("updated_at = datetime('now','localtime')")
        values.push(id)
        db.prepare(`UPDATE diaries SET ${fields.join(', ')} WHERE id = ?`).run(...values)
      }

      if (data.person_ids !== undefined) {
        db.prepare(`DELETE FROM diary_persons WHERE diary_id = ?`).run(id)
        if (data.person_ids.length > 0) {
          const stmt = db.prepare(`INSERT INTO diary_persons (diary_id, person_id) VALUES (?, ?)`)
          for (const personId of data.person_ids) {
            stmt.run(id, personId)
          }
        }
      }
    })
    tx()

    const diary = db.prepare(`SELECT * FROM diaries WHERE id = ?`).get(id) as Diary
    pluginManager.emitEvent('diary:saved', diary).catch(() => {})
    return { success: true, data: diary }
  } catch (e) {
    return { success: false, error: (e as Error).message }
  }
}

export function deleteDiary(id: string): Result<void> {
  try {
    const db = getDb()
    const deleteDiaryPersons = db.prepare('DELETE FROM diary_persons WHERE diary_id = ?')
    const deleteTaggings = db.prepare("DELETE FROM taggings WHERE target_id = ? AND target_type = 'diary'")
    const deleteDiary = db.prepare('DELETE FROM diaries WHERE id = ?')
    const doDelete = db.transaction(() => {
      deleteDiaryPersons.run(id)
      deleteTaggings.run(id)
      const result = deleteDiary.run(id)
      if (result.changes === 0) {
        throw new Error('日记不存在')
      }
    })
    doDelete()
    pluginManager.emitEvent('diary:deleted', { id }).catch(() => {})
    return { success: true, data: undefined }
  } catch (e) {
    return { success: false, error: (e as Error).message }
  }
}

export function listDiaries(filter?: DiaryFilter): Result<Diary[]> {
  try {
    const db = getDb()

    // MED-013: 构建查询的逻辑抽离，支持 FTS5 与 LIKE 两种关键词匹配方式
    const buildQuery = (useFts: boolean) => {
      let sql = `SELECT d.* FROM diaries d`
      const conditions: string[] = []
      const params: string[] = []

      if (filter?.person_id) {
        sql += ` JOIN diary_persons dp ON d.id = dp.diary_id`
        conditions.push('dp.person_id = ?')
        params.push(filter.person_id)
      }

      if (filter?.start_date) {
        conditions.push('d.diary_date >= ?')
        params.push(filter.start_date)
      }

      if (filter?.end_date) {
        conditions.push('d.diary_date <= ?')
        params.push(filter.end_date)
      }

      if (filter?.keyword) {
        if (useFts) {
          sql += ` JOIN diaries_fts ON d.rowid = diaries_fts.rowid`
          conditions.push('diaries_fts MATCH ?')
          params.push(escapeFtsQuery(filter.keyword))
        } else {
          // FTS5 不可用时回退到 LIKE 全表扫描
          conditions.push("(d.content LIKE '%' || ? || '%' OR COALESCE(d.title, '') LIKE '%' || ? || '%')")
          params.push(filter.keyword, filter.keyword)
        }
      }

      if (conditions.length > 0) {
        sql += ' WHERE ' + conditions.join(' AND ')
      }

      sql += ` ORDER BY d.diary_date DESC, d.created_at DESC`
      return { sql, params }
    }

    // 优先使用 FTS5 全文检索；若 FTS5 查询出错则回退到 LIKE
    let diaries: Diary[]
    try {
      const { sql, params } = buildQuery(true)
      diaries = db.prepare(sql).all(...params) as Diary[]
    } catch {
      const { sql, params } = buildQuery(false)
      diaries = db.prepare(sql).all(...params) as Diary[]
    }

    return { success: true, data: diaries }
  } catch (e) {
    return { success: false, error: (e as Error).message }
  }
}
