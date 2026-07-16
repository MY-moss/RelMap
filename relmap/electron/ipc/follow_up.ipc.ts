import { ipcMain } from 'electron'
import { logIpcError } from '../logger'
import {
  createFollowUp,
  updateFollowUp,
  deleteFollowUp,
  getFollowUpById,
  listFollowUp,
} from '../../src/main/db/repositories/follow_up.repo'
import type { Result, FollowUpQueue, CreateFollowUpDto, UpdateFollowUpDto, FollowUpFilter } from '../../src/shared/types'

export function registerFollowUpIPC(): void {
  ipcMain.handle(
    'follow-up:create',
    async (_event, data: CreateFollowUpDto): Promise<Result<FollowUpQueue>> => {
      try {
        return createFollowUp(data)
      } catch (e) {
        logIpcError('follow-up:create', e)
        return { success: false, error: (e as Error).message }
      }
    },
  )

  ipcMain.handle(
    'follow-up:update',
    async (_event, id: string, data: UpdateFollowUpDto): Promise<Result<FollowUpQueue>> => {
      try {
        return updateFollowUp(id, data)
      } catch (e) {
        logIpcError('follow-up:update', e)
        return { success: false, error: (e as Error).message }
      }
    },
  )

  ipcMain.handle('follow-up:delete', async (_event, id: string): Promise<Result<void>> => {
    try {
      return deleteFollowUp(id)
    } catch (e) {
      logIpcError('follow-up:delete', e)
      return { success: false, error: (e as Error).message }
    }
  })

  ipcMain.handle('follow-up:getById', async (_event, id: string): Promise<Result<FollowUpQueue>> => {
    try {
      return getFollowUpById(id)
    } catch (e) {
      logIpcError('follow-up:getById', e)
      return { success: false, error: (e as Error).message }
    }
  })

  ipcMain.handle(
    'follow-up:list',
    async (_event, filter?: FollowUpFilter): Promise<Result<FollowUpQueue[]>> => {
      try {
        return listFollowUp(filter)
      } catch (e) {
        logIpcError('follow-up:list', e)
        return { success: false, error: (e as Error).message }
      }
    },
  )
}