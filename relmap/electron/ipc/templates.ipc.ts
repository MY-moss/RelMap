import { ipcMain } from 'electron'
import type { Result, MessageTemplate } from '../../src/shared/types'
import {
  createTemplate,
  updateTemplate,
  deleteTemplate,
  getTemplateById,
  listTemplates,
} from '../../src/main/db/repositories/templates.repo'

export function registerTemplateIPC(): void {
  ipcMain.handle(
    'template:create',
    async (_event, data: { name: string; content: string; category?: string }): Promise<Result<MessageTemplate>> => {
      try {
        return createTemplate(data)
      } catch (e) {
        return { success: false, error: (e as Error).message }
      }
    }
  )

  ipcMain.handle(
    'template:update',
    async (_event, id: string, data: Partial<{ name: string; content: string; category: string }>): Promise<Result<MessageTemplate>> => {
      try {
        return updateTemplate(id, data)
      } catch (e) {
        return { success: false, error: (e as Error).message }
      }
    }
  )

  ipcMain.handle('template:delete', async (_event, id: string): Promise<Result<void>> => {
    try {
      return deleteTemplate(id)
    } catch (e) {
      return { success: false, error: (e as Error).message }
    }
  })

  ipcMain.handle('template:getById', async (_event, id: string): Promise<Result<MessageTemplate>> => {
    try {
      return getTemplateById(id)
    } catch (e) {
      return { success: false, error: (e as Error).message }
    }
  })

  ipcMain.handle(
    'template:list',
    async (_event, category?: string): Promise<Result<MessageTemplate[]>> => {
      try {
        return listTemplates(category)
      } catch (e) {
        return { success: false, error: (e as Error).message }
      }
    }
  )
}
