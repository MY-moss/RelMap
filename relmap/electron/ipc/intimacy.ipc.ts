import { ipcMain } from 'electron'
import { logIpcError } from '../logger'
import { calculateIntimacy } from '../../src/main/ai/intimacy'
import type { IntimacyScore } from '../../src/main/ai/intimacy'
import type { Result } from '../../src/shared/types'

export function registerIntimacyIPC(): void {
  ipcMain.handle(
    'ai:calculateIntimacy',
    async (_event, personId: string): Promise<Result<IntimacyScore>> => {
      try {
        return calculateIntimacy(personId)
      } catch (e) {
      logIpcError('ai:calculateIntimacy', e)
      return { success: false, error: (e as Error).message }
    }
  },
  )
}
