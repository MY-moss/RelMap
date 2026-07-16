import { logger } from './logger'

export function ipcTimed<T>(channel: string, handler: (...args: unknown[]) => T): (...args: unknown[]) => T {
  return (...args: unknown[]) => {
    const start = performance.now()
    try {
      const result = handler(...args)
      const duration = performance.now() - start
      if (duration > 100) {
        logger.warn({ module: `ipc:${channel}`, context: { duration } }, `IPC slow call (>100ms)`)
      }
      return result
    } catch (error) {
      const duration = performance.now() - start
      logger.error({ module: `ipc:${channel}`, err: error, context: { duration } }, `IPC error`)
      throw error
    }
  }
}
