import { randomUUID } from 'node:crypto'
import { getDb } from '../connection'
import type {
  Result,
  SocialAccount,
  CreateSocialAccountDto,
  UpdateSocialAccountDto,
} from '../../../shared/types'

export function createSocialAccount(data: CreateSocialAccountDto): Result<SocialAccount> {
  try {
    const db = getDb()
    const id = randomUUID()
    const normalizedPlatform = data.platform.trim().toLowerCase()
    db.prepare(`
      INSERT INTO social_accounts (id, person_id, platform, account_id, account_name, is_primary, sort_order)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).run(
      id,
      data.person_id,
      normalizedPlatform,
      data.account_id,
      data.account_name ?? null,
      data.is_primary ?? 0,
      data.sort_order ?? 0,
    )
    const account = db.prepare('SELECT * FROM social_accounts WHERE id = ?').get(id) as SocialAccount
    return { success: true, data: account }
  } catch (e) {
    return { success: false, error: (e as Error).message }
  }
}

export function updateSocialAccount(id: string, data: UpdateSocialAccountDto): Result<SocialAccount> {
  try {
    const db = getDb()
    const existing = db.prepare('SELECT * FROM social_accounts WHERE id = ?').get(id) as SocialAccount | undefined
    if (!existing) {
      return { success: false, error: `Social account not found: ${id}` }
    }

    const fields: string[] = []
    const params: unknown[] = []

    if (data.person_id !== undefined) { fields.push('person_id = ?'); params.push(data.person_id) }
    if (data.platform !== undefined) { fields.push('platform = ?'); params.push(data.platform.trim().toLowerCase()) }
    if (data.account_id !== undefined) { fields.push('account_id = ?'); params.push(data.account_id) }
    if (data.account_name !== undefined) { fields.push('account_name = ?'); params.push(data.account_name) }
    if (data.is_primary !== undefined) { fields.push('is_primary = ?'); params.push(data.is_primary) }
    if (data.sort_order !== undefined) { fields.push('sort_order = ?'); params.push(data.sort_order) }

    if (fields.length === 0) {
      return { success: true, data: existing }
    }

    params.push(id)
    db.prepare(`UPDATE social_accounts SET ${fields.join(', ')} WHERE id = ?`).run(...params)

    const updated = db.prepare('SELECT * FROM social_accounts WHERE id = ?').get(id) as SocialAccount
    return { success: true, data: updated }
  } catch (e) {
    return { success: false, error: (e as Error).message }
  }
}

export function deleteSocialAccount(id: string): Result<void> {
  try {
    const db = getDb()
    const result = db.prepare('DELETE FROM social_accounts WHERE id = ?').run(id)
    if (result.changes === 0) {
      return { success: false, error: `Social account not found: ${id}` }
    }
    return { success: true, data: undefined }
  } catch (e) {
    return { success: false, error: (e as Error).message }
  }
}

export function listSocialAccountsByPerson(personId: string): Result<SocialAccount[]> {
  try {
    const db = getDb()
    const rows = db.prepare(
      'SELECT * FROM social_accounts WHERE person_id = ? ORDER BY is_primary DESC, sort_order ASC, created_at ASC',
    ).all(personId) as SocialAccount[]
    return { success: true, data: rows }
  } catch (e) {
    return { success: false, error: (e as Error).message }
  }
}

export function setSocialAccountPrimary(id: string): Result<SocialAccount> {
  try {
    const db = getDb()
    const account = db.prepare('SELECT * FROM social_accounts WHERE id = ?').get(id) as SocialAccount | undefined
    if (!account) {
      return { success: false, error: `Social account not found: ${id}` }
    }

    const tx = db.transaction(() => {
      // 先清除同 person 的其他 primary
      db.prepare(
        'UPDATE social_accounts SET is_primary = 0 WHERE person_id = ? AND is_primary = 1',
      ).run(account.person_id)
      // 再设置当前为 primary
      db.prepare('UPDATE social_accounts SET is_primary = 1 WHERE id = ?').run(id)
    })
    tx()

    const updated = db.prepare('SELECT * FROM social_accounts WHERE id = ?').get(id) as SocialAccount
    return { success: true, data: updated }
  } catch (e) {
    return { success: false, error: (e as Error).message }
  }
}
