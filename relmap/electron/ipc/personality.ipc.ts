import { ipcMain } from 'electron'
import { logIpcError } from '../logger'
import { buildPersonalityProfile } from '../../src/main/ai/personality_profile'
import type { PersonalityProfile } from '../../src/shared/types'
import type { Result } from '../../src/shared/types'

export function registerPersonalityIPC(): void {
  ipcMain.handle(
    'personality:buildProfile',
    async (_event, personId: string): Promise<Result<PersonalityProfile>> => {
      try {
        return buildPersonalityProfile(personId)
      } catch (e) {
      logIpcError('personality:buildProfile', e)
      return { success: false, error: (e as Error).message }
    }
  },
  )
}
