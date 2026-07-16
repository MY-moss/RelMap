import { ipcMain } from 'electron'

import { logIpcError } from '../logger'
import { getTodayMemories, getRandomMemory } from '../../src/main/db/repositories/memory_capsule.repo'
import type { Result } from '../../src/shared/types'
import type { MemoryCapsuleItem } from '../../src/main/db/repositories/memory_capsule.repo'

export function registerMemoryCapsuleIPC(): void {
  ipcMain.handle('memory:today', async (): Promise<Result<MemoryCapsuleItem[]>> => {
    try {
      return getTodayMemories()
    } catch (e) {
      logIpcError('memory:today', e)
      return { success: false, error: (e as Error).message }
    }
  })

  ipcMain.handle('memory:random', async (): Promise<Result<MemoryCapsuleItem>> => {
    try {
      return getRandomMemory()
    } catch (e) {
      logIpcError('memory:random', e)
      return { success: false, error: (e as Error).message }
    }
  })
}
