import { ipcMain } from 'electron'
import { generateWrappedReport } from '../../src/main/db/repositories/wrapped.repo'
import type { Result } from '../../src/shared/types'
import type { WrappedReport } from '../../src/main/db/repositories/wrapped.repo'

export function registerWrappedIPC(): void {
  ipcMain.handle(
    'wrapped:generate',
    async (_event, year: number): Promise<Result<WrappedReport>> => {
      try {
        const validatedYear = typeof year === 'number' && year >= 1900 && year <= 2100 ? Math.floor(year) : new Date().getFullYear()
        return generateWrappedReport(validatedYear)
      } catch (e) {
        return { success: false, error: (e as Error).message }
      }
    },
  )
}
