import { randomUUID } from 'node:crypto'
import { getDb } from '../connection'
import type { Result, Tag } from '../../../shared/types'

export type TagTargetType = 'person' | 'event' | 'diary'

const TAG_COLUMNS = 'id, name, color, parent_id'

function getTagByIdInternal(id: string): Tag | undefined {
  const db = getDb()
  return db.prepare(`SELECT ${TAG_COLUMNS} FROM tags WHERE id = ?`).get(id) as Tag | undefined
}

export function createTag(data: { name: string; color?: string; parent_id?: string }): Result<Tag> {
  try {
    const db = getDb()
    const id = randomUUID()
    db.prepare(`INSERT INTO tags (id, name, color, parent_id) VALUES (?, ?, ?, ?)`).run(
      id,
      data.name,
      data.color ?? '#6366f1',
      data.parent_id ?? null
    )
    const tag = getTagByIdInternal(id)
    if (!tag) {
      return { success: false, error: '创建标签后查询失败' }
    }
    return { success: true, data: tag }
  } catch (e) {
    const msg = (e as Error).message
    // name 唯一约束冲突时给出更友好的提示
    if (msg.includes('UNIQUE') || msg.includes('unique')) {
      return { success: false, error: `标签名已存在: ${data.name}` }
    }
    return { success: false, error: msg }
  }
}

export function updateTag(
  id: string,
  data: Partial<{ name: string; color: string; parent_id: string | null }>
): Result<Tag> {
  try {
    const db = getDb()
    const existing = getTagByIdInternal(id)
    if (!existing) {
      return { success: false, error: `标签不存在: ${id}` }
    }

    const fields: string[] = []
    const params: unknown[] = []

    if (data.name !== undefined) {
      fields.push('name = ?')
      params.push(data.name)
    }
    if (data.color !== undefined) {
      fields.push('color = ?')
      params.push(data.color)
    }
    if (data.parent_id !== undefined) {
      fields.push('parent_id = ?')
      params.push(data.parent_id)
    }

    if (fields.length === 0) {
      return { success: true, data: existing }
    }

    params.push(id)
    db.prepare(`UPDATE tags SET ${fields.join(', ')} WHERE id = ?`).run(...params)

    const updated = getTagByIdInternal(id)
    if (!updated) {
      return { success: false, error: '更新标签后查询失败' }
    }
    return { success: true, data: updated }
  } catch (e) {
    const msg = (e as Error).message
    if (msg.includes('UNIQUE') || msg.includes('unique')) {
      return { success: false, error: `标签名已存在` }
    }
    return { success: false, error: msg }
  }
}

export function deleteTag(id: string): Result<void> {
  try {
    const db = getDb()
    const result = db.prepare('DELETE FROM tags WHERE id = ?').run(id)
    if (result.changes === 0) {
      return { success: false, error: `标签不存在: ${id}` }
    }
    // taggings 关联由 ON DELETE CASCADE 自动删除
    return { success: true, data: undefined }
  } catch (e) {
    return { success: false, error: (e as Error).message }
  }
}

export function getTagById(id: string): Result<Tag> {
  try {
    const tag = getTagByIdInternal(id)
    if (!tag) {
      return { success: false, error: `标签不存在: ${id}` }
    }
    return { success: true, data: tag }
  } catch (e) {
    return { success: false, error: (e as Error).message }
  }
}

export function listTags(): Result<Tag[]> {
  try {
    const db = getDb()
    const tags = db
      .prepare(`SELECT ${TAG_COLUMNS} FROM tags ORDER BY name ASC`)
      .all() as Tag[]
    return { success: true, data: tags }
  } catch (e) {
    return { success: false, error: (e as Error).message }
  }
}

export function listTagsByParent(parentId?: string): Result<Tag[]> {
  try {
    const db = getDb()
    let sql: string
    const params: unknown[] = []
    if (parentId === undefined) {
      sql = `SELECT ${TAG_COLUMNS} FROM tags WHERE parent_id IS NULL ORDER BY name ASC`
    } else {
      sql = `SELECT ${TAG_COLUMNS} FROM tags WHERE parent_id = ? ORDER BY name ASC`
      params.push(parentId)
    }
    const tags = db.prepare(sql).all(...params) as Tag[]
    return { success: true, data: tags }
  } catch (e) {
    return { success: false, error: (e as Error).message }
  }
}

export function applyTag(
  tagId: string,
  targetId: string,
  targetType: TagTargetType
): Result<void> {
  try {
    const db = getDb()

    const tagExists = db.prepare('SELECT id FROM tags WHERE id = ?').get(tagId)
    if (!tagExists) return { success: false, error: `标签 ${tagId} 不存在` }

    if (targetType === 'person') {
      const targetExists = db.prepare('SELECT id FROM persons WHERE id = ?').get(targetId)
      if (!targetExists) return { success: false, error: `联系人 ${targetId} 不存在` }
    }

    // INSERT OR IGNORE 避免重复标签关联导致的 UNIQUE 冲突
    db.prepare(
      `INSERT OR IGNORE INTO taggings (tag_id, target_id, target_type) VALUES (?, ?, ?)`
    ).run(tagId, targetId, targetType)
    return { success: true, data: undefined }
  } catch (e) {
    return { success: false, error: (e as Error).message }
  }
}

export function removeTag(
  tagId: string,
  targetId: string,
  targetType: TagTargetType
): Result<void> {
  try {
    const db = getDb()
    const result = db
      .prepare(
        `DELETE FROM taggings WHERE tag_id = ? AND target_id = ? AND target_type = ?`
      )
      .run(tagId, targetId, targetType)
    if (result.changes === 0) {
      return {
        success: false,
        error: `标签关联不存在: tagId=${tagId}, targetId=${targetId}, targetType=${targetType}`,
      }
    }
    return { success: true, data: undefined }
  } catch (e) {
    return { success: false, error: (e as Error).message }
  }
}

export function listTagsByTarget(
  targetId: string,
  targetType: TagTargetType
): Result<Tag[]> {
  try {
    const db = getDb()
    const tags = db
      .prepare(
        `SELECT t.id, t.name, t.color
         FROM tags t
         INNER JOIN taggings tg ON tg.tag_id = t.id
         WHERE tg.target_id = ? AND tg.target_type = ?
         ORDER BY t.name ASC`
      )
      .all(targetId, targetType) as Tag[]
    return { success: true, data: tags }
  } catch (e) {
    return { success: false, error: (e as Error).message }
  }
}

export function listTargetsByTag(
  tagId: string
): Result<{ target_id: string; target_type: string }[]> {
  try {
    const db = getDb()
    const targets = db
      .prepare(
        `SELECT target_id, target_type FROM taggings WHERE tag_id = ?`
      )
      .all(tagId) as { target_id: string; target_type: string }[]
    return { success: true, data: targets }
  } catch (e) {
    return { success: false, error: (e as Error).message }
  }
}
