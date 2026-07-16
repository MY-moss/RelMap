import { ipcMain, clipboard } from 'electron'
import type { Result } from '../../src/shared/types'

export function registerClipboardIPC(): void {
  ipcMain.handle('clipboard:writeText', async (_event, text: string): Promise<Result<void>> => {
    try {
      clipboard.writeText(String(text))
      return { success: true, data: undefined }
    } catch (e) {
      return { success: false, error: (e as Error).message }
    }
  })
}
