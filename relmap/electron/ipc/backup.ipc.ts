// RelMap 备份 IPC 处理器
// 提供备份导出、导入恢复、历史备份列表功能
// 使用 Electron dialog 让用户选择文件路径

import { ipcMain } from 'electron'
import {
  exportBackup,
  importBackup,
  listBackups,
  ensureBackupsDir,
  getDefaultBackupPath,
} from '../../src/main/db/backup'
import type { Result } from '../../src/shared/types'
import { showSaveDialogHelper, showOpenDialogHelper } from './dialog-helper'
import { logIpcError } from '../logger'

export function registerBackupIPC(): void {
  // ========== 导出备份 ==========
  // 参数: password?: string（可选加密密码）
  // 返回: Result<{ path: string; size: number; timestamp: string }>
  ipcMain.handle('backup:export', async (_event, password?: string): Promise<Result<{ path: string; size: number; timestamp: string }>> => {
    try {
      // 确保备份目录存在
      ensureBackupsDir()

      // 生成默认保存路径
      const defaultPath = getDefaultBackupPath(password)

      // 根据是否加密设置文件过滤器
      const filters = password
        ? [{ name: '加密备份文件 (*.db.enc)', extensions: ['enc'] }]
        : [{ name: '数据库备份文件 (*.db)', extensions: ['db'] }]

      // 弹出保存对话框
      const result = await showSaveDialogHelper({
        title: '导出 RelMap 备份',
        defaultPath,
        filters,
        properties: ['createDirectory'],
      })

      // 用户取消选择
      if (result.canceled || !result.filePath) {
        return { success: false, error: '用户取消了导出操作' }
      }

      // 执行备份导出
      return exportBackup(result.filePath, password)
    } catch (e) {
      logIpcError('backup:export', e)
      return { success: false, error: (e as Error).message }
    }
  })

  // ========== 导入恢复 ==========
  // 参数: password?: string（可选解密密码）
  // 返回: Result<{ restored: boolean; timestamp: string }>
  ipcMain.handle('backup:import', async (_event, password?: string): Promise<Result<{ restored: boolean; timestamp: string }>> => {
    try {
      // 弹出打开对话框
      const result = await showOpenDialogHelper({
        title: '导入 RelMap 备份',
        properties: ['openFile'],
        filters: [
          { name: '备份文件', extensions: ['db', 'enc'] },
          { name: '所有文件', extensions: ['*'] },
        ],
      })

      // 用户取消选择
      if (result.canceled || result.filePaths.length === 0) {
        return { success: false, error: '用户取消了导入操作' }
      }

      const inputPath = result.filePaths[0]

      // 执行备份导入
      return importBackup(inputPath, password)
    } catch (e) {
      logIpcError('backup:import', e)
      return { success: false, error: (e as Error).message }
    }
  })

  // ========== 列出历史备份 ==========
  // 参数: 无
  // 返回: Result<BackupInfo[]>
  ipcMain.handle('backup:list', async () => {
    try {
      return listBackups()
    } catch (error) {
      logIpcError('backup:list', error)
      return { success: false, error: (error as Error).message }
    }
  })
}
