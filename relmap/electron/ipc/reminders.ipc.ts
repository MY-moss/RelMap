import { ipcMain } from 'electron'
import {
  createReminder,
  updateReminder,
  deleteReminder,
  getReminderById,
  listReminders,
  listUpcomingReminders,
  listFollowUpReminders,
  type CreateReminderDto,
  type UpdateReminderDto,
  type ReminderFilter,
} from '../../src/main/db/repositories/reminders.repo'
import type { Result, Reminder, FollowUpItem } from '../../src/shared/types'

export function registerReminderIPC(): void {
  ipcMain.handle(
    'reminder:create',
    async (_event, data: CreateReminderDto): Promise<Result<Reminder>> => {
      try {
        return createReminder(data)
      } catch (e) {
      logIpcError('reminder:create', e)
      return { success: false, error: (e as Error).message }
    }
  })

  ipcMain.handle(
    'reminder:update',
    async (_event, id: string, data: UpdateReminderDto): Promise<Result<Reminder>> => {
      try {
        return updateReminder(id, data)
      } catch (e) {
      logIpcError('reminder:update', e)
      return { success: false, error: (e as Error).message }
    }
  })

  ipcMain.handle('reminder:delete', async (_event, id: string): Promise<Result<void>> => {
    try {
      return deleteReminder(id)
    } catch (e) {
      logIpcError('reminder:delete', e)
      return { success: false, error: (e as Error).message }
    }
  })

  ipcMain.handle('reminder:getById', async (_event, id: string): Promise<Result<Reminder>> => {
    try {
      return getReminderById(id)
    } catch (e) {
      logIpcError('reminder:getById', e)
      return { success: false, error: (e as Error).message }
    }
  })

  ipcMain.handle(
    'reminder:list',
    async (_event, filter?: ReminderFilter): Promise<Result<Reminder[]>> => {
      try {
        return listReminders(filter)
      } catch (e) {
      logIpcError('reminder:list', e)
      return { success: false, error: (e as Error).message }
    }
  })

  ipcMain.handle('reminder:upcoming', async (_event, days: number): Promise<Result<Reminder[]>> => {
    try {
      return listUpcomingReminders(days)
    } catch (e) {
      logIpcError('reminder:upcoming', e)
      return { success: false, error: (e as Error).message }
    }
  })

  ipcMain.handle('reminder:listFollowUp', async (): Promise<Result<FollowUpItem[]>> => {
    try {
      return listFollowUpReminders()
    } catch (e) {
      logIpcError('reminder:listFollowUp', e)
      return { success: false, error: (e as Error).message }
    }
  })
}
