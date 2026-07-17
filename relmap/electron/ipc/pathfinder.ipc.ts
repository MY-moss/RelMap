import { ipcMain } from 'electron'
import { logIpcError } from '../logger'
import { findPath } from '../../src/main/ai/pathfinder'
import type { Result, PathResult } from '../../src/shared/types'

export function registerPathfinderIPC(): void {
  ipcMain.handle(
    'pathfinder:find',
    async (_event, aId: string, bId: string, maxPaths?: number): Promise<Result<PathResult>> => {
      try {
        return findPath(aId, bId, maxPaths)
      } catch (e) {
        logIpcError('pathfinder:find', e)
        return { success: false, error: (e as Error).message }
      }
    }
  )
}
