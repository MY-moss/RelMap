import { ipcMain } from 'electron'
import { logIpcError } from '../logger'
import {
  createEvent,
  updateEvent,
  deleteEvent,
  listEvents,
} from '../../src/main/db/repositories/events.repo'
import type {
  CreateEventDto,
  UpdateEventDto,
  EventFilter,
  Result,
  EventItem,
} from '../../src/shared/types'

export function registerEventIPC(): void {
  ipcMain.handle('event:create', async (_event, data: CreateEventDto): Promise<Result<EventItem>> => {
    try {
      return createEvent(data)
    } catch (error) {
      logIpcError('event:create', error)
      return { success: false, error: (error as Error).message }
    }
  })

  ipcMain.handle(
    'event:update',
    async (_event, id: string, data: UpdateEventDto): Promise<Result<EventItem>> => {
      try {
        return updateEvent(id, data)
      } catch (error) {
        logIpcError('event:update', error)
        return { success: false, error: (error as Error).message }
      }
    }
  )

  ipcMain.handle('event:delete', async (_event, id: string): Promise<Result<void>> => {
    try {
      return deleteEvent(id)
    } catch (error) {
      logIpcError('event:delete', error)
      return { success: false, error: (error as Error).message }
    }
  })

  ipcMain.handle('event:list', async (_event, filter?: EventFilter): Promise<Result<EventItem[]>> => {
    try {
      return listEvents(filter)
    } catch (error) {
      logIpcError('event:list', error)
      return { success: false, error: (error as Error).message }
    }
  })
}
