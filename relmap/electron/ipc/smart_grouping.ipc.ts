import { ipcMain } from 'electron'
import { logIpcError } from '../logger'
import { generateGroupSuggestions } from '../../src/main/ai/smart_grouping'

export function registerSmartGroupingIPC(): void {
  ipcMain.handle('ai:generateGroupSuggestions', async () => {
    try {
      return generateGroupSuggestions()
    } catch (error) {
      logIpcError('ai:generateGroupSuggestions', error)
      return { success: false, error: (error as Error).message }
    }
  })
}
