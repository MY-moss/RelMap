import { ipcMain } from 'electron'
import { getDb } from '../../src/main/db/connection'
import type { Result } from '../../src/shared/types'

const startTime = Date.now()

interface HealthReport {
  status: 'healthy' | 'degraded' | 'unhealthy'
  timestamp: string
  uptime: number
  checks: Record<string, { status: 'pass' | 'fail'; message?: string }>
}

async function performHealthCheck(): Promise<HealthReport> {
  const checks: Record<string, { status: 'pass' | 'fail'; message?: string }> = {}

  // DB check
  try {
    const db = getDb()
    const result = db.pragma('integrity_check') as string
    checks.db = result === 'ok'
      ? { status: 'pass' }
      : { status: 'fail', message: `DB integrity: ${result}` }
  } catch (err) {
    checks.db = { status: 'fail', message: (err as Error).message }
  }

  // Memory check
  const memUsage = process.memoryUsage()
  const heapMB = Math.round(memUsage.heapUsed / 1024 / 1024)
  checks.memory = heapMB > 500
    ? { status: 'fail', message: `Heap ${heapMB}MB exceeds 500MB` }
    : { status: 'pass' }

  // Determine overall status
  const failCount = Object.values(checks).filter(c => c.status === 'fail').length
  const status: HealthReport['status'] = failCount === 0 ? 'healthy' : failCount <= 1 ? 'degraded' : 'unhealthy'

  return {
    status,
    timestamp: new Date().toISOString(),
    uptime: Math.round((Date.now() - startTime) / 1000),
    checks,
  }
}

export function registerHealthCheckIPC() {
  ipcMain.handle('app:healthCheck', async (): Promise<Result<HealthReport>> => {
    try {
      const report = await performHealthCheck()
      return { success: true, data: report }
    } catch (e) {
      return { success: false, error: (e as Error).message }
    }
  })
}
