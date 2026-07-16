// Sentry 必须在所有其他导入之前导入
import * as Sentry from '@sentry/electron/main'
import { app, BrowserWindow, dialog } from 'electron'
import { autoUpdater } from 'electron-updater'
import { fileURLToPath } from 'node:url'
import path from 'node:path'
import fs from 'node:fs'
import { getDb, closeDb, runMigrations, checkDatabaseIntegrity } from '../src/main/db'
import { registerAllIPC, setUpdateMainWindow } from './ipc'
import { checkCrashRecovery, clearRunningFlag } from './crash-detection'
import { logger } from './logger'
import { beforeSend } from '../src/shared/sentry-privacy'
import { pluginManager } from '../src/main/plugin/plugin-manager'
import { terminateOcrWorker } from '../src/main/ai/ocr'

// Windows 控制台默认用 GBK，强制切到 UTF-8 避免中文乱码
if (process.platform === 'win32') {
  app.commandLine.appendSwitch('utf8-output')
}

const __dirname = path.dirname(fileURLToPath(import.meta.url))

process.env.APP_ROOT = path.join(__dirname, '..')

export const VITE_DEV_SERVER_URL = process.env['VITE_DEV_SERVER_URL']
export const MAIN_DIST = path.join(process.env.APP_ROOT, 'dist-electron')
export const RENDERER_DIST = path.join(process.env.APP_ROOT, 'dist')

process.env.VITE_PUBLIC = VITE_DEV_SERVER_URL ? path.join(process.env.APP_ROOT, 'public') : RENDERER_DIST

// ==================== Sentry 初始化 ====================
const SENTRY_DSN = process.env.SENTRY_DSN || ''
const isDev = !app.isPackaged

/** 从 app-config.json 读取 Sentry 启用状态（默认启用） */
function readSentryEnabled(): boolean {
  try {
    const configPath = path.join(app.getPath('userData'), 'app-config.json')
    if (fs.existsSync(configPath)) {
      const config = JSON.parse(fs.readFileSync(configPath, 'utf-8'))
      // 显式设置为 false 时才禁用，未设置时默认启用
      return config.sentryEnabled !== false
    }
  } catch {
    // 配置文件读取失败时默认启用
  }
  return true
}

if (SENTRY_DSN && readSentryEnabled()) {
  Sentry.init({
    dsn: SENTRY_DSN,
    environment: isDev ? 'development' : 'production',
    tracesSampleRate: isDev ? 1.0 : 0.2,
    beforeSend,
  })
  logger.info('[Sentry] 主进程错误监控已启用')
} else if (!SENTRY_DSN) {
  logger.info('[Sentry] DSN 未配置，跳过初始化')
} else {
  logger.info('[Sentry] 错误监控已被用户禁用')
}

let win: BrowserWindow | null

function createWindow() {
  win = new BrowserWindow({
    icon: path.join(process.env.VITE_PUBLIC || '', 'electron-vite.svg'),
    width: 1200,
    height: 800,
    minWidth: 900,
    minHeight: 600,
    webPreferences: {
      preload: path.join(__dirname, 'preload.mjs'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
      webSecurity: true,
      allowRunningInsecureContent: false,
      spellcheck: false,
    },
  })

  if (VITE_DEV_SERVER_URL) {
    win.loadURL(VITE_DEV_SERVER_URL)
  } else {
    win.loadFile(path.join(RENDERER_DIST, 'index.html'))
  }
}

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
    win = null
  }
})

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow()
  }
})

app.whenReady().then(async () => {
  // 崩溃检测（必须在初始化数据库之前检查）
  const wasCrash = checkCrashRecovery()
  if (wasCrash) {
    logger.warn('[Startup] 检测到上次异常退出')
  }

  // 初始化数据库
  try {
    const db = getDb()
    runMigrations(db)
    const integrity = checkDatabaseIntegrity()
    if (!integrity.ok) {
      logger.warn({ result: integrity.message }, '[DB] 数据库完整性检查异常')
    } else {
      logger.info('[DB] 数据库完整性检查通过')
    }
    logger.info('[DB] 数据库初始化完成')
  } catch (err) {
    logger.error({ err }, '[DB] 数据库初始化失败')
    Sentry.captureException(err)
    dialog.showErrorBox(
        'RelMap 启动失败',
        `数据库初始化失败，应用无法继续运行。\n\n错误信息: ${String(err)}\n\n请联系技术支持。`
      )
    app.quit()
    return
  }

  // 注册IPC
  registerAllIPC()

  // 初始化插件系统
  try {
    await pluginManager.initialize()
    logger.info('[PluginSystem] 插件系统初始化完成')
  } catch (err) {
    logger.error({ err }, '[PluginSystem] 插件系统初始化失败')
  }

  // 通知插件系统应用已就绪
  process.nextTick(() => {
    pluginManager.emitEvent('app:ready').catch((err) => {
      logger.error({ err }, '[PluginSystem] app:ready 事件发送失败')
    })
  })

  // 创建窗口
  createWindow()

  // 启动后延迟检查更新（不阻塞启动）
  if (win) {
    setUpdateMainWindow(win)
    setTimeout(() => {
      autoUpdater.checkForUpdates().catch(() => {
        // 静默失败，不影响用户体验
      })
    }, 5000)
  }
})

app.on('before-quit', () => {
  try {
    closeDb()
  } catch (error) {
    logger.error({ error }, '[DB] 关闭数据库失败')
    Sentry.captureException(error)
  }
  try {
    terminateOcrWorker()
  } catch (error) {
    logger.error({ error }, '[OCR] 终止 worker 失败')
  }
})

app.on('will-quit', () => {
  clearRunningFlag()
})
