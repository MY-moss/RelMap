import { ipcMain } from 'electron'
import { createDiary, updateDiary, deleteDiary, listDiaries } from '../../src/main/db/repositories/diaries.repo'
import type { Result, Diary, CreateDiaryDto, UpdateDiaryDto, DiaryFilter } from '../../src/shared/types'

export function registerDiaryIPC(): void {
  ipcMain.handle('diary:create', async (_event, data: CreateDiaryDto): Promise<Result<Diary>> => {
    try {
      return createDiary(data)
    } catch (e) {
      logIpcError('diary:create', e)
      return { success: false, error: (e as Error).message }
    }
  })
  ipcMain.handle('diary:update', async (_event, id: string, data: UpdateDiaryDto): Promise<Result<Diary>> => {
    try {
      return updateDiary(id, data)
    } catch (e) {
      logIpcError('diary:update', e)
      return { success: false, error: (e as Error).message }
    }
  })
  ipcMain.handle('diary:delete', async (_event, id: string): Promise<Result<void>> => {
    try {
      return deleteDiary(id)
    } catch (e) {
      logIpcError('diary:delete', e)
      return { success: false, error: (e as Error).message }
    }
  })
  ipcMain.handle('diary:list', async (_event, filter?: DiaryFilter): Promise<Result<Diary[]>> => {
    try {
      return listDiaries(filter)
    } catch (e) {
      logIpcError('diary:list', e)
      return { success: false, error: (e as Error).message }
    }
  })
}