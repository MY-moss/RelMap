import { ipcMain } from 'electron'
import {
  createInteractionLog,
  updateInteractionLog,
  deleteInteractionLog,
  listInteractionLogs,
  listInteractionLogsByPerson,
  getLastInteractionDate,
  type CreateInteractionLogDto,
  type UpdateInteractionLogDto,
  type InteractionLogFilter,
} from '../../src/main/db/repositories/interaction_logs.repo'
import type { Result, InteractionLog } from '../../src/shared/types'

export function registerInteractionLogIPC(): void {
  ipcMain.handle(
    'interaction:create',
    async (_event, data: CreateInteractionLogDto): Promise<Result<InteractionLog>> => {
      try {
        return createInteractionLog(data)
      } catch (e) {
      logIpcError('interaction:create', e)
      return { success: false, error: (e as Error).message }
    }
  })

  ipcMain.handle(
    'interaction:update',
    async (_event, id: string, data: UpdateInteractionLogDto): Promise<Result<InteractionLog>> => {
      try {
        return updateInteractionLog(id, data)
      } catch (e) {
        return { success: false, error: (e as Error).message }
      }
    }
  )

  ipcMain.handle('interaction:delete', async (_event, id: string): Promise<Result<void>> => {
    try {
      return deleteInteractionLog(id)
    } catch (e) {
      logIpcError('interaction:delete', e)
      return { success: false, error: (e as Error).message }
    }
  })

  ipcMain.handle(
    'interaction:list',
    async (_event, filter?: InteractionLogFilter): Promise<Result<InteractionLog[]>> => {
      try {
        return listInteractionLogs(filter)
      } catch (e) {
      logIpcError('interaction:list', e)
      return { success: false, error: (e as Error).message }
    }
  })

  ipcMain.handle(
    'interaction:listByPerson',
    async (_event, personId: string, limit?: number): Promise<Result<InteractionLog[]>> => {
      try {
        return listInteractionLogsByPerson(personId, limit)
      } catch (e) {
      logIpcError('interaction:listByPerson', e)
      return { success: false, error: (e as Error).message }
    }
  })

  ipcMain.handle(
    'interaction:lastDate',
    async (_event, personId: string): Promise<Result<string | null>> => {
      try {
        return getLastInteractionDate(personId)
      } catch (e) {
      logIpcError('interaction:lastDate', e)
      return { success: false, error: (e as Error).message }
    }
  })
}
