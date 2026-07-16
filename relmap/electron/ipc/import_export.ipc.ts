import { ipcMain } from 'electron'
import fs from 'node:fs'
import {
  importVCard,
  exportContactsCSV,
  exportContactsJSON,
  exportAllDataJSON,
} from '../../src/main/db/repositories/import_export.repo'
import type { Result } from '../../src/shared/types'
import { showOpenDialogHelper, showSaveDialogHelper } from './dialog-helper'

// 导入导出 IPC 通道注册
export function registerImportExportIPC(): void {
  // 导入 vCard 文本
  ipcMain.handle('io:importVCard', async (_event, vcardText: string): Promise<Result<{ imported: number; skipped: number; errors: string[] }>> => {
    try {
      return importVCard(vcardText)
    } catch (e) {
      logIpcError('io:importVCard', e)
      return { success: false, error: (e as Error).message }
    }
  })

  // 打开文件选择对话框，读取 vCard 文件并导入
  ipcMain.handle('io:importVCardFile', async (): Promise<Result<{ imported: number; skipped: number; errors: string[] }>> => {
    try {
      const result = await showOpenDialogHelper({
        title: '选择 vCard 文件',
        filters: [
          { name: 'vCard 文件', extensions: ['vcf', 'vcard'] },
          { name: '所有文件', extensions: ['*'] },
        ],
        properties: ['openFile'],
      })

      if (result.canceled || result.filePaths.length === 0) {
        return { success: false, error: '用户取消选择' }
      }

      const filePath = result.filePaths[0]
      const content = await fs.promises.readFile(filePath, 'utf-8')
      return importVCard(content)
    } catch (e) {
      logIpcError('io:importVCardFile', e)
      return { success: false, error: (e as Error).message }
    }
  })

  // 导出 CSV，使用 dialog.showSaveDialog 选择保存路径
  ipcMain.handle('io:exportCSV', async (): Promise<Result<string>> => {
    try {
      const exportResult = exportContactsCSV()
      if (!exportResult.success) return exportResult

      const result = await showSaveDialogHelper({
        title: '导出 CSV',
        defaultPath: `contacts_${new Date().toISOString().slice(0, 10)}.csv`,
        filters: [{ name: 'CSV 文件', extensions: ['csv'] }],
      })

      if (result.canceled || !result.filePath) {
        return { success: false, error: '用户取消保存' }
      }

      await fs.promises.writeFile(result.filePath, exportResult.data, 'utf-8')
      return { success: true, data: result.filePath }
    } catch (e) {
      logIpcError('io:exportCSV', e)
      return { success: false, error: (e as Error).message }
    }
  })

  // 导出 JSON：mode='contacts' 仅联系人，mode='all' 全部数据
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
          title: mode === 'contacts' ? '导出联系人 JSON' : '导出全部数据 JSON',
          defaultPath: defaultName,
          filters: [{ name: 'JSON 文件', extensions: ['json'] }],
        })

        if (result.canceled || !result.filePath) {
          return { success: false, error: '用户取消保存' }
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
