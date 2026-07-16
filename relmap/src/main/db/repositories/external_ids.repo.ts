import { randomUUID } from 'node:crypto'
import { getDb } from '../connection'
import type { Result } from '../../../shared/types'

export type ExternalTargetType = 'person' | 'event'

export function setExternalId(targetId: string, targetType: ExternalTargetType, pluginId: string, externalId: string, externalData?: string): Result<{ id: string }> {
  try {
    const db = getDb()
    const existing = db.prepare("SELECT id FROM external_ids WHERE target_type = ? AND target_id = ? AND plugin_id = ?").get(targetType, targetId, pluginId) as { id: string } | undefined
    if (existing) {
      db.prepare("UPDATE external_ids SET external_id = ?, external_data = ?, updated_at = datetime('now','localtime') WHERE id = ?").run(externalId, externalData ?? null, existing.id)
      return { success: true, data: { id: existing.id } }
    }
    const id = randomUUID()
    db.prepare("INSERT INTO external_ids (id, target_id, target_type, plugin_id, external_id, external_data) VALUES (?, ?, ?, ?, ?, ?)").run(id, targetId, targetType, pluginId, externalId, externalData ?? null)
    return { success: true, data: { id } }
  } catch (e) {
    return { success: false, error: (e as Error).message }
  }
}

export function getByExternalId(pluginId: string, externalId: string, targetType: ExternalTargetType): Result<{ target_id: string; external_data?: string } | null> {
  try {
    const db = getDb()
    const row = db.prepare("SELECT target_id, external_data FROM external_ids WHERE target_type = ? AND plugin_id = ? AND external_id = ?").get(targetType, pluginId, externalId) as { target_id: string; external_data: string | null } | undefined
    return { success: true, data: row ? { target_id: row.target_id, external_data: row.external_data || undefined } : null }
  } catch (e) {
    return { success: false, error: (e as Error).message }
  }
}

export function deleteByTarget(targetId: string, targetType: ExternalTargetType, pluginId: string): Result<void> {
  try {
    const db = getDb()
    db.prepare("DELETE FROM external_ids WHERE target_type = ? AND target_id = ? AND plugin_id = ?").run(targetType, targetId, pluginId)
    return { success: true, data: undefined }
  } catch (e) {
    return { success: false, error: (e as Error).message }
  }
}
