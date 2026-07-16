import { ipcMain } from 'electron'
import { logger } from '../logger'
import * as externalIdsRepo from '../../src/main/db/repositories/external_ids.repo'
import type { Result } from '../../src/shared/types'

export function registerExternalIdsIPC(): void {
  ipcMain.handle('external:set', async (_event, targetId: string, targetType: string, pluginId: string, externalId: string, externalData?: string): Promise<Result<{ id: string }>> => {
    try {
      if (targetType !== 'person' && targetType !== 'event') {
        return { success: false, error: 'Invalid target type' }
      }
      return externalIdsRepo.setExternalId(targetId, targetType as externalIdsRepo.ExternalTargetType, pluginId, externalId, externalData)
    } catch (e) {
      return { success: false, error: (e as Error).message }
    }
  })

  ipcMain.handle('external:getByExternalId', async (_event, pluginId: string, externalId: string, targetType: string): Promise<Result<{ target_id: string; external_data?: string } | null>> => {
    try {
      if (targetType !== 'person' && targetType !== 'event') {
        return { success: false, error: 'Invalid target type' }
      }
      return externalIdsRepo.getByExternalId(pluginId, externalId, targetType as externalIdsRepo.ExternalTargetType)
    } catch (e) {
      return { success: false, error: (e as Error).message }
    }
  })

  logger.info('[ExternalIDs] IPC handlers registered')
}
