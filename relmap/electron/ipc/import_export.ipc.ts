import { ipcMain } from 'electron'
import fs from 'node:fs'
import {
  importVCard,
  exportContactsCSV,
  exportContactsJSON,
  exportAllDataJSON,
} from '../../src/main/db/repositories/import_export.repo'
import type { Result } from '../../src/shared/types'
import { logIpcError } from '../logger'
import { showOpenDialogHelper, showSaveDialogHelper } from './dialog-helper'

// 瀵煎叆瀵煎嚭 IPC 閫氶亾娉ㄥ唽
export function registerImportExportIPC(): void {
  // 瀵煎叆 vCard 鏂囨湰
  ipcMain.handle('io:importVCard', async (_event, vcardText: string): Promise<Result<{ imported: number; skipped: number; errors: string[] }>> => {
    try {
      return importVCard(vcardText)
    } catch (e) {
      logIpcError('io:importVCard', e)
      return { success: false, error: (e as Error).message }
    }
  })

  // 鎵撳紑鏂囦欢閫夋嫨瀵硅瘽妗嗭紝璇诲彇 vCard 鏂囦欢骞跺鍏?
  ipcMain.handle('io:importVCardFile', async (): Promise<Result<{ imported: number; skipped: number; errors: string[] }>> => {
    try {
      const result = await showOpenDialogHelper({
        title: '閫夋嫨 vCard 鏂囦欢',
        filters: [
          { name: 'vCard 鏂囦欢', extensions: ['vcf', 'vcard'] },
          { name: '所有文件', extensions: ['*'] },
        ],
        properties: ['openFile'],
      })

      if (result.canceled || result.filePaths.length === 0) {
        return { success: false, error: '鐢ㄦ埛鍙栨秷閫夋嫨' }
      }

      const filePath = result.filePaths[0]
      const content = await fs.promises.readFile(filePath, 'utf-8')
      return importVCard(content)
    } catch (e) {
      logIpcError('io:importVCardFile', e)
      return { success: false, error: (e as Error).message }
    }
  })

  // 瀵煎嚭 CSV锛屼娇鐢?dialog.showSaveDialog 閫夋嫨淇濆瓨璺緞
  ipcMain.handle('io:exportCSV', async (): Promise<Result<string>> => {
    try {
      const exportResult = exportContactsCSV()
      if (!exportResult.success) return exportResult

      const result = await showSaveDialogHelper({
        title: '瀵煎嚭 CSV',
        defaultPath: `contacts_${new Date().toISOString().slice(0, 10)}.csv`,
        filters: [{ name: 'CSV 鏂囦欢', extensions: ['csv'] }],
      })

      if (result.canceled || !result.filePath) {
        return { success: false, error: '鐢ㄦ埛鍙栨秷淇濆瓨' }
      }

      await fs.promises.writeFile(result.filePath, exportResult.data, 'utf-8')
      return { success: true, data: result.filePath }
    } catch (e) {
      logIpcError('io:exportCSV', e)
      return { success: false, error: (e as Error).message }
    }
  })

  // 瀵煎嚭 JSON锛歮ode='contacts' 浠呰仈绯讳汉锛宮ode='all' 鍏ㄩ儴鏁版嵁
  ipcMain.handle(
    'io:exportJSON',
    async (_event, mode: 'contacts' | 'all'): Promise<Result<string>> => {
      try {
        const exportResult =
          mode === 'contacts' ? exportContactsJSON() : exportAllDataJSON()
        if (!exportResult.success) return exportResult

        const defaultName =
          mode === 'contacts'
            ? `contacts_${new Date().toISOString().slice(0, 10)}.json`
            : `relmap_backup_${new Date().toISOString().slice(0, 10)}.json`
        const result = await showSaveDialogHelper({
          title: mode === 'contacts' ? '瀵煎嚭鑱旂郴浜?JSON' : '瀵煎嚭鍏ㄩ儴鏁版嵁 JSON',
          defaultPath: defaultName,
          filters: [{ name: 'JSON 鏂囦欢', extensions: ['json'] }],
        })

        if (result.canceled || !result.filePath) {
          return { success: false, error: '鐢ㄦ埛鍙栨秷淇濆瓨' }
        }

        await fs.promises.writeFile(result.filePath, exportResult.data, 'utf-8')
        return { success: true, data: result.filePath }
      } catch (e) {
      logIpcError('io:exportJSON', e)
      return { success: false, error: (e as Error).message }
    }
  },
  )
}
