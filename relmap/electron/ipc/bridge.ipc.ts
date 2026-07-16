import { ipcMain } from 'electron'
import { detectBridges } from '../../src/main/ai/bridge_detector'
import type { BridgePerson } from '../../src/shared/types'
import type { Result } from '../../src/shared/types'

export function registerBridgeIPC(): void {
  ipcMain.handle(
    'bridge:detect',
    async (_event, topN?: number): Promise<Result<BridgePerson[]>> => {
      try {
        return detectBridges(topN)
      } catch (e) {
      logIpcError('bridge:detect', e)
      return { success: false, error: (e as Error).message }
    }
  },
  )
}
