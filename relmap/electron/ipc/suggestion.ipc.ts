import { ipcMain } from 'electron'
import { logIpcError } from '../logger'
import { generateSuggestions } from '../../src/main/ai/suggestion_engine'
import type { SuggestionItem } from '../../src/shared/types'
import type { Result } from '../../src/shared/types'

export function registerSuggestionIPC(): void {
  ipcMain.handle(
    'suggestion:generate',
    async (_event, personId: string): Promise<Result<SuggestionItem[]>> => {
      try {
        return generateSuggestions(personId)
      } catch (e) {
      logIpcError('suggestion:generate', e)
      return { success: false, error: (e as Error).message }
    }
  },
  )
}
