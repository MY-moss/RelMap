import { ipcMain } from 'electron'

import { logIpcError } from '../logger'
import { predictIntimacyTrend } from '../../src/main/ai/intimacy_prediction'
import type { IntimacyPrediction } from '../../src/shared/types'
import type { Result } from '../../src/shared/types'

export function registerIntimacyPredictionIPC(): void {
  ipcMain.handle(
    'intimacy_prediction:predict',
    async (_event, personId: string): Promise<Result<IntimacyPrediction>> => {
      try {
        return predictIntimacyTrend(personId)
      } catch (e) {
      logIpcError('intimacy_prediction:predict', e)
      return { success: false, error: (e as Error).message }
    }
  },
  )
}
