import { randomUUID } from 'node:crypto'
import { getDb } from '../connection'
import type { Result, Group, Person } from '../../../shared/types'

const GROUP_COLUMNS = 'id, name, description, avatar_path, color, created_at'

function getGroupByIdInternal(id: string): Group | undefined {
  try {
    const db = getDb()
    return db.prepare(`SELECT ${GROUP_COLUMNS} FROM groups WHERE id = ?`).get(id) as
      | Group
      | undefined
  } catch {
    return undefined
  }
}

export function createGroup(data: {
  name: string
  description?: string
  color?: string
}): Result<Group> {
  try {
    const db = getDb()
    const id = randomUUID()
    db.prepare(
      `INSERT INTO groups (id, name, description, color) VALUES (?, ?, ?, ?)`
    ).run(
      id,
      data.name,
      data.description ?? null,
      data.color ?? '#6366f1'
    )
    const group = getGroupByIdInternal(id)
    if (!group) {
      return { success: false, error: '创建群组后查询失败' }
    }
    return { success: true, data: group }
  } catch (e) {
    return { success: false, error: (e as Error).message }
  }
}

export function updateGroup(
  id: string,
  data: Partial<{ name: string; description?: string; color?: string }>
): Result<Group> {
  try {
    const db = getDb()
    const existing = getGroupByIdInternal(id)
    if (!existing) {
      return { success: false, error: `群组不存在: ${id}` }
    }

    const fields: string[] = []
    const params: unknown[] = []

    if (data.name !== undefined) {
      fields.push('name = ?')
      params.push(data.name)
    }
    if (data.description !== undefined) {
      fields.push('description = ?')
      params.push(data.description)
    }
    if (data.color !== undefined) {
      fields.push('color = ?')
      params.push(data.color)
    }

    if (fields.length === 0) {
      return { success: true, data: existing }
    }

    params.push(id)
    db.prepare(`UPDATE groups SET ${fields.join(', ')} WHERE id = ?`).run(...params)

    const updated = getGroupByIdInternal(id)
    if (!updated) {
      return { success: false, error: '更新群组后查询失败' }
    }
    return { success: true, data: updated }
  } catch (e) {
    return { success: false, error: (e as Error).message }
  }
}

export function deleteGroup(id: string): Result<void> {
  try {
    const db = getDb()
    const result = db.prepare('DELETE FROM groups WHERE id = ?').run(id)
    if (result.changes === 0) {
      return { success: false, error: `群组不存在: ${id}` }
    }
    // group_members 关联由 ON DELETE CASCADE 自动删除
    return { success: true, data: undefined }
  } catch (e) {
    return { success: false, error: (e as Error).message }
  }
}

export function getGroupById(id: string): Result<Group> {
  try {
    const group = getGroupByIdInternal(id)
    if (!group) {
      return { success: false, error: `群组不存在: ${id}` }
    }
    return { success: true, data: group }
  } catch (e) {
    return { success: false, error: (e as Error).message }
  }
}

export function listGroups(): Result<Group[]> {
  try {
    const db = getDb()
    const groups = db
      .prepare(`SELECT ${GROUP_COLUMNS} FROM groups ORDER BY created_at DESC`)
      .all() as Group[]
    return { success: true, data: groups }
  } catch (e) {
    return { success: false, error: (e as Error).message }
  }
}

export function addGroupMembers(groupId: string, personIds: string[]): Result<void> {
  try {
    const db = getDb()
    const group = getGroupByIdInternal(groupId)
    if (!group) {
      return { success: false, error: `群组不存在: ${groupId}` }
    }

    if (personIds.length === 0) {
      return { success: true, data: undefined }
    }

    const insertMember = db.prepare(
      `INSERT OR IGNORE INTO group_members (group_id, person_id, role) VALUES (?, ?, 'member')`
    )

    const tx = db.transaction(() => {
      for (const personId of personIds) {
        insertMember.run(groupId, personId)
      }
    })
    tx()

    return { success: true, data: undefined }
  } catch (e) {
    return { success: false, error: (e as Error).message }
  }
}

export function removeGroupMember(groupId: string, personId: string): Result<void> {
  try {
    const db = getDb()
    const result = db
      .prepare('DELETE FROM group_members WHERE group_id = ? AND person_id = ?')
      .run(groupId, personId)
    if (result.changes === 0) {
      return { success: false, error: `成员不存在: groupId=${groupId}, personId=${personId}` }
    }
    return { success: true, data: undefined }
  } catch (e) {
    return { success: false, error: (e as Error).message }
  }
}

export function listGroupMembers(groupId: string): Result<Person[]> {
  try {
    const db = getDb()
    const persons = db
      .prepare(
        `SELECT p.* FROM persons p
         INNER JOIN group_members gm ON gm.person_id = p.id
         WHERE gm.group_id = ?
         ORDER BY gm.joined_at ASC`
      )
      .all(groupId) as Person[]
    return { success: true, data: persons }
  } catch (e) {
    return { success: false, error: (e as Error).message }
  }
}

export function listPersonGroups(personId: string): Result<Group[]> {
  try {
    const db = getDb()
    const groups = db
      .prepare(
        `SELECT g.id, g.name, g.description, g.avatar_path, g.color, g.created_at
         FROM groups g
         INNER JOIN group_members gm ON gm.group_id = g.id
         WHERE gm.person_id = ?
         ORDER BY g.created_at DESC`
      )
      .all(personId) as Group[]
    return { success: true, data: groups }
  } catch (e) {
    return { success: false, error: (e as Error).message }
  }
}
