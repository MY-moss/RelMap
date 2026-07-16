import { ipcMain } from 'electron'
import type { Result } from '../../src/shared/types'
import { detectDuplicates } from '../../src/main/ai/duplicate_detect'
import type { DuplicateResult } from '../../src/main/ai/duplicate_detect'

/**
 * 注册重复联系人检测 IPC
 * - ai:detectDuplicates 检测新联系人与已有联系人的重复
 */
export function registerDuplicateDetectIPC(): void {
  ipcMain.handle(
    'ai:detectDuplicates',
    async (
      _event,
      newPerson: {
        name: string
        company?: string
        phone?: string
        email?: string
      },
    ): Promise<Result<DuplicateResult>> => {
      try {
        return detectDuplicates(newPerson)
      } catch (e) {
      logIpcError('ai:detectDuplicates', e)
      return { success: false, error: (e as Error).message }
    }
  },
  )
}
