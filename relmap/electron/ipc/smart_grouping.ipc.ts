import { ipcMain } from 'electron'
import { generateGroupSuggestions } from '../../src/main/ai/smart_grouping'

export function registerSmartGroupingIPC(): void {
  ipcMain.handle('ai:generateGroupSuggestions', async () => {
    try {
      return generateGroupSuggestions()
    } catch (error) {
      logIpcError('ai:generateGroupSuggestions', e)
      return { success: false, error: (error as Error).message }
    }
  })
}
