import pino from 'pino'
import { app } from 'electron'
import path from 'node:path'
import fs from 'node:fs'

const isDev = !!process.env['VITE_DEV_SERVER_URL']
const logDir = isDev 
  ? path.join(process.env.APP_ROOT || process.cwd(), 'logs')
  : path.join(app.getPath('userData'), 'logs')

// Ensure log directory exists
if (!fs.existsSync(logDir)) {
  fs.mkdirSync(logDir, { recursive: true })
}

export const logger = pino({
  level: process.env.NODE_ENV === 'development' ? 'debug' : 'info',
}, pino.destination({
  dest: path.join(logDir, 'app.log'),
  minLength: 4096,
  sync: false,
}))

export function logIpcError(ipc: string, err: unknown, message = 'IPC handler error'): void {
  logger.error({ err, ipc }, message)
}
