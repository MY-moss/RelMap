import { app } from 'electron'
import fs from 'node:fs'
import path from 'node:path'
import { logger } from './logger'

const isDev = !!process.env['VITE_DEV_SERVER_URL']
const RUNNING_FLAG = isDev 
  ? path.join(process.env.APP_ROOT || process.cwd(), '.running')
  : path.join(app.getPath('userData'), '.running')

export function checkCrashRecovery(): boolean {
  let crashed = false
  try {
    crashed = fs.existsSync(RUNNING_FLAG)
    if (crashed) {
      logger.warn({ module: 'startup' }, 'Previous crash detected')
    }
    fs.writeFileSync(RUNNING_FLAG, String(Date.now()))
  } catch (err) {
    logger.warn({ err, module: 'startup' }, 'Failed to access running flag file')
  }
  return crashed
}

export function clearRunningFlag(): void {
  try {
    if (fs.existsSync(RUNNING_FLAG)) fs.unlinkSync(RUNNING_FLAG)
  } catch { /* ignore */ }
}
