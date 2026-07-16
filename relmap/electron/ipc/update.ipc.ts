import { ipcMain, BrowserWindow } from 'electron'
import { autoUpdater } from 'electron-updater'
import { logger } from '../logger'

autoUpdater.autoDownload = false
autoUpdater.autoInstallOnAppQuit = true

let mainWindow: BrowserWindow | null = null

export function setUpdateMainWindow(win: BrowserWindow | null) {
  mainWindow = win
}

function send(channel: string, ...args: unknown[]) {
  if (mainWindow && !mainWindow.isDestroyed()) {
    mainWindow.webContents.send(channel, ...args)
  }
}

export function registerUpdateIPC(): void {
  autoUpdater.on('checking-for-update', () => {
    logger.info('[Updater] 正在检查更新…')
    send('update:checking')
  })

  autoUpdater.on('update-available', (info) => {
    logger.info({ version: info.version }, '[Updater] 发现新版本')
    send('update:available', {
      version: info.version,
      releaseDate: info.releaseDate,
      releaseNotes: info.releaseNotes,
    })
  })

  autoUpdater.on('update-not-available', () => {
    logger.info('[Updater] 已是最新版本')
    send('update:not-available')
  })

  autoUpdater.on('download-progress', (progress) => {
    send('update:progress', {
      percent: progress.percent,
      bytesPerSecond: progress.bytesPerSecond,
      total: progress.total,
      transferred: progress.transferred,
    })
  })

  autoUpdater.on('update-downloaded', () => {
    logger.info('[Updater] 更新已下载')
    send('update:downloaded')
  })

  autoUpdater.on('error', (err) => {
    logger.error({ err }, '[Updater] 检查更新失败')
    send('update:error', err.message)
  })

  ipcMain.handle('update:check', async () => {
    try {
      await autoUpdater.checkForUpdates()
      return { success: true }
    } catch (e) {
      return { success: false, error: (e as Error).message }
    }
  })

  ipcMain.handle('update:download', async () => {
    try {
      await autoUpdater.downloadUpdate()
      return { success: true }
    } catch (e) {
      return { success: false, error: (e as Error).message }
    }
  })

  ipcMain.handle('update:install', () => {
    setImmediate(() => autoUpdater.quitAndInstall())
  })
}
