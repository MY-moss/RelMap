import { randomUUID } from 'node:crypto'
import { getDb } from '../connection'
import type { Result, MessageTemplate } from '../../../shared/types'

const TEMPLATE_COLUMNS = 'id, name, content, category, created_at, updated_at'

function getTemplateByIdInternal(id: string): MessageTemplate | undefined {
  const db = getDb()
  return db.prepare(`SELECT ${TEMPLATE_COLUMNS} FROM message_templates WHERE id = ?`).get(id) as MessageTemplate | undefined
}

export function createTemplate(data: { name: string; content: string; category?: string }): Result<MessageTemplate> {
  try {
    const db = getDb()
    const id = randomUUID()
    db.prepare(`INSERT INTO message_templates (id, name, content, category) VALUES (?, ?, ?, ?)`).run(
      id,
      data.name,
      data.content,
      data.category ?? 'general'
    )
    const template = getTemplateByIdInternal(id)
    if (!template) {
      return { success: false, error: '创建模板后查询失败' }
    }
    return { success: true, data: template }
  } catch (e) {
    return { success: false, error: (e as Error).message }
  }
}

export function updateTemplate(
  id: string,
  data: Partial<{ name: string; content: string; category: string }>
): Result<MessageTemplate> {
  try {
    const db = getDb()
    const existing = getTemplateByIdInternal(id)
    if (!existing) {
      return { success: false, error: `模板不存在: ${id}` }
    }

    const fields: string[] = []
    const params: unknown[] = []

    if (data.name !== undefined) {
      fields.push('name = ?')
      params.push(data.name)
    }
    if (data.content !== undefined) {
      fields.push('content = ?')
      params.push(data.content)
    }
    if (data.category !== undefined) {
      fields.push('category = ?')
      params.push(data.category)
    }

    if (fields.length === 0) {
      return { success: true, data: existing }
    }

    fields.push('updated_at = datetime(\'now\',\'localtime\')')
    params.push(id)
    db.prepare(`UPDATE message_templates SET ${fields.join(', ')} WHERE id = ?`).run(...params)

    const updated = getTemplateByIdInternal(id)
    if (!updated) {
      return { success: false, error: '更新模板后查询失败' }
    }
    return { success: true, data: updated }
  } catch (e) {
    return { success: false, error: (e as Error).message }
  }
}

export function deleteTemplate(id: string): Result<void> {
  try {
    const db = getDb()
    const result = db.prepare('DELETE FROM message_templates WHERE id = ?').run(id)
    if (result.changes === 0) {
      return { success: false, error: `模板不存在: ${id}` }
    }
    return { success: true, data: undefined }
  } catch (e) {
    return { success: false, error: (e as Error).message }
  }
}

export function getTemplateById(id: string): Result<MessageTemplate> {
  try {
    const template = getTemplateByIdInternal(id)
    if (!template) {
      return { success: false, error: `模板不存在: ${id}` }
    }
    return { success: true, data: template }
  } catch (e) {
    return { success: false, error: (e as Error).message }
  }
}

export function listTemplates(category?: string): Result<MessageTemplate[]> {
  try {
    const db = getDb()
    let sql = `SELECT ${TEMPLATE_COLUMNS} FROM message_templates`
    const params: unknown[] = []
    if (category && category !== 'all') {
      sql += ' WHERE category = ?'
      params.push(category)
    }
    sql += ' ORDER BY name ASC'
    const templates = db.prepare(sql).all(...params) as MessageTemplate[]
    return { success: true, data: templates }
  } catch (e) {
    return { success: false, error: (e as Error).message }
  }
}
