import { logger } from './logger'
import { getDb } from '../src/main/db/connection'

export interface HealthReport {
  status: 'ok' | 'degraded' | 'warning'
  db: { ok: boolean; latency: number }
  memory: { usageMB: number; threshold: number }
  uptime: number
}

export async function performHealthCheck(): Promise<HealthReport> {
  const report: HealthReport = {
    status: 'ok',
    db: { ok: false, latency: 0 },
    memory: { usageMB: 0, threshold: 200 },
    uptime: process.uptime(),
  }

  const dbStart = performance.now()
  try {
    const db = getDb()
    const row = db.prepare('SELECT 1 as ok').get() as { ok: number }
    report.db.ok = row.ok === 1
    report.db.latency = performance.now() - dbStart
  } catch {
    report.db.ok = false
    report.status = 'degraded'
  }

  report.memory.usageMB = Math.round(process.memoryUsage().heapUsed / 1024 / 1024)
  if (report.memory.usageMB > 200) report.status = 'warning'

  logger.info({ module: 'healthcheck', context: report }, 'Health check complete')
  return report
}
