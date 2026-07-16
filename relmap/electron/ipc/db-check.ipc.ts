import { ipcMain } from 'electron'
import { logIpcError } from '../logger'
import { getDb } from '../../src/main/db/connection'
import type { Result, IntegrityCheckResult } from '../../src/shared/types'

export function registerDbCheckIPC(): void {
  ipcMain.handle('db:checkIntegrity', async (): Promise<Result<IntegrityCheckResult>> => {
    try {
      const db = getDb()
      const row = db.prepare('PRAGMA integrity_check').get() as { integrity_check: string }
      const ok = row.integrity_check === 'ok'
      return {
        success: true,
        data: { ok, message: ok ? '数据库完整性验证通过' : `数据库损�? ${row.integrity_check}` },
      }
    } catch (e) {
      logIpcError('db:checkIntegrity', e)
      return { success: false, error: (e as Error).message }
    }
  })
}
