import { ipcMain } from 'electron'
import { pluginManager } from '../../src/main/plugin/plugin-manager'
import type { Result, PluginInfo } from '../../src/shared/types'
import { showOpenDialogHelper } from './dialog-helper'
import { logger } from '../logger'

function validatePluginName(name: string): boolean {
  if (typeof name !== 'string') return false
  if (name.length < 1 || name.length > 100) return false
  if (!/^[a-zA-Z0-9_.-]+$/.test(name)) return false
  if (/\.\.[/\\]/.test(name)) return false
  return true
}

export function registerPluginIPC(): void {
  ipcMain.handle('plugin:scan', async (): Promise<Result<PluginInfo[]>> => {
    try {
      await pluginManager.scanPlugins()
      const plugins = pluginManager.getPlugins()
      return { success: true, data: plugins }
    } catch (e) {
      logger.error({ err: e, ipc: 'plugin:scan' }, 'IPC handler error')
      return { success: false, error: (e as Error).message }
    }
  })

  ipcMain.handle('plugin:load', async (_event, name: string): Promise<Result<boolean>> => {
    try {
      if (!validatePluginName(name)) {
        return { success: false, error: 'Invalid plugin name' }
      }
      const ok = await pluginManager.loadPlugin(name)
      return { success: true, data: ok }
    } catch (e) {
      logger.error({ err: e, ipc: 'plugin:load' }, 'IPC handler error')
      return { success: false, error: (e as Error).message }
    }
  })

  ipcMain.handle('plugin:setEnabled', async (_event, name: string, enabled: boolean): Promise<Result<void>> => {
    try {
      if (!validatePluginName(name)) {
        return { success: false, error: 'Invalid plugin name' }
      }
      await pluginManager.setPluginEnabled(name, enabled)
      return { success: true, data: undefined }
    } catch (e) {
      logger.error({ err: e, ipc: 'plugin:setEnabled' }, 'IPC handler error')
      return { success: false, error: (e as Error).message }
    }
  })

  ipcMain.handle('plugin:list', async (): Promise<Result<PluginInfo[]>> => {
    try {
      const plugins = pluginManager.getPlugins()
      return { success: true, data: plugins }
    } catch (e) {
      logger.error({ err: e, ipc: 'plugin:list' }, 'IPC handler error')
      return { success: false, error: (e as Error).message }
    }
  })

  ipcMain.handle('plugin:install', async (): Promise<Result<PluginInfo>> => {
    try {
      const result = await showOpenDialogHelper({
        title: '选择插件目录',
        properties: ['openDirectory'],
      })
      if (result.canceled || result.filePaths.length === 0) {
        return { success: false, error: '用户取消了安装' }
      }
      const manifest = await pluginManager.installPlugin(result.filePaths[0])
      if (!manifest) {
        return { success: false, error: '所选目录不包含有效的 plugin.json' }
      }
      const info = pluginManager.getPlugin(manifest.name)
      return { success: true, data: info! }
    } catch (e) {
      logger.error({ err: e, ipc: 'plugin:install' }, 'IPC handler error')
      return { success: false, error: (e as Error).message }
    }
  })

  ipcMain.handle('plugin:uninstall', async (_event, name: string): Promise<Result<void>> => {
    try {
      if (!validatePluginName(name)) {
        return { success: false, error: 'Invalid plugin name' }
      }
      await pluginManager.uninstallPlugin(name)
      return { success: true, data: undefined }
    } catch (e) {
      logger.error({ err: e, ipc: 'plugin:uninstall' }, 'IPC handler error')
      return { success: false, error: (e as Error).message }
    }
  })

  ipcMain.handle('plugin:getStatus', async (_event, name: string): Promise<Result<PluginInfo | null>> => {
    try {
      if (!validatePluginName(name)) {
        return { success: false, error: 'Invalid plugin name' }
      }
      const info = pluginManager.getPlugin(name)
      return { success: true, data: info ?? null }
    } catch (e) {
      logger.error({ err: e, ipc: 'plugin:getStatus' }, 'IPC handler error')
      return { success: false, error: (e as Error).message }
    }
  })

  ipcMain.handle('plugin:callHandler', async (_event, pluginName: string, handlerName: string, ...args: unknown[]): Promise<Result<unknown>> => {
    try {
      if (!validatePluginName(pluginName)) return { success: false, error: 'Invalid plugin name' }
      const ctx = pluginManager.getPluginContext(pluginName)
      if (!ctx) return { success: false, error: 'Plugin not found' }
      const handler = ctx.pluginHandlers.get(handlerName)
      if (!handler) return { success: false, error: `Handler "${handlerName}" not found in plugin "${pluginName}"` }
      const result = await handler(...args)
      return { success: true, data: result }
    } catch (e) {
      return { success: false, error: (e as Error).message }
    }
  })

  ipcMain.handle('plugin:getLogs', async (_event, name: string): Promise<Result<string[]>> => {
    try {
      if (!validatePluginName(name)) {
        return { success: false, error: 'Invalid plugin name' }
      }
      const ctx = pluginManager.getPluginContext(name)
      if (!ctx) return { success: false, error: 'Plugin not found' }
      const logs = ctx.logs ?? []
      return { success: true, data: logs.slice(-200) }
    } catch (e) {
      logger.error({ err: e, ipc: 'plugin:getLogs' }, 'IPC handler error')
      return { success: false, error: (e as Error).message }
    }
  })
}
