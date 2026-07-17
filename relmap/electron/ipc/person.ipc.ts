import { ipcMain, app } from 'electron'
import { logIpcError } from '../logger'
import path from 'node:path'
import fs from 'node:fs'
import type {
  Result,
  Person,
  CreatePersonDto,
  UpdatePersonDto,
  PersonFilter,
} from '../../src/shared/types'
import {
  createPerson,
  updatePerson,
  deletePerson,
  deletePersons,
  getPersonById,
  listPersons,
  togglePersonFavorite,
  setPersonMainIdentity,
  getMainPerson,
} from '../../src/main/db/repositories/person.repo'
import { applyTagsToTarget } from '../../src/main/db/repositories/tags.repo'
import { createReminder, listReminders } from '../../src/main/db/repositories/reminders.repo'

export function registerPersonIPC(): void {
  ipcMain.handle('person:create', async (_event, data: CreatePersonDto): Promise<Result<Person>> => {
    try {
      const result = createPerson(data)
      if (result.success && data.birthday) {
        const existing = listReminders({ person_id: result.data.id, is_active: true })
        const hasBirthdayReminder = existing.success && existing.data.some(
          (r) => r.repeat_type === 'yearly' && r.title.includes('生日')
        )
        if (!hasBirthdayReminder) {
          const reminderResult = createReminder({
          person_id: result.data.id,
          title: `${result.data.name} 的生日`,
          remind_date: data.birthday,
          repeat_type: 'yearly',
          note: `自动�?{result.data.name}创建的生日提醒`,
        })
        if (!reminderResult.success) {
          logIpcError('person:create', reminderResult.error, '生日提醒创建失败')
        }
        }
      }
      return result
    } catch (error) {
      logIpcError('person:create', error)
      return { success: false, error: (error as Error).message }
    }
  })

  ipcMain.handle('person:update', async (_event, id: string, data: UpdatePersonDto): Promise<Result<Person>> => {
    try {
      const result = updatePerson(id, data)
      if (result.success && data.birthday) {
        const existing = listReminders({ person_id: result.data.id, is_active: true })
        const hasBirthdayReminder = existing.success && existing.data.some(
          (r) => r.repeat_type === 'yearly' && r.title.includes('生日')
        )
        if (!hasBirthdayReminder) {
          const reminderResult = createReminder({
          person_id: result.data.id,
          title: `${result.data.name} 的生日`,
          remind_date: data.birthday,
          repeat_type: 'yearly',
          note: `自动�?{result.data.name}创建的生日提醒`,
        })
        if (!reminderResult.success) {
          logIpcError('person:update', reminderResult.error, '生日提醒创建失败')
        }
        }
      }
      return result
    } catch (e) {
      logIpcError('person:update', e)
      return { success: false, error: (e as Error).message }
    }
  })

  ipcMain.handle('person:delete', async (_event, id: string): Promise<Result<void>> => {
    try {
      return deletePerson(id)
    } catch (e) {
      logIpcError('person:delete', e)
      return { success: false, error: (e as Error).message }
    }
  })

  ipcMain.handle('person:batchTag', async (_event, personIds: string[], tagIds: string[]): Promise<Result<void>> => {
    try {
      for (const pid of personIds) {
        const r = applyTagsToTarget(pid, 'person', tagIds)
        if (!r.success) return r
      }
      return { success: true, data: undefined }
    } catch (e) {
      logIpcError('person:batchTag', e)
      return { success: false, error: (e as Error).message }
    }
  })

  ipcMain.handle('person:batchDelete', async (_event, ids: string[]): Promise<Result<{ deleted: number }>> => {
    try {
      return deletePersons(ids)
    } catch (e) {
      logIpcError('person:batchDelete', e)
      return { success: false, error: (e as Error).message }
    }
  })

  ipcMain.handle('person:getById', async (_event, id: string): Promise<Result<Person>> => {
    try {
      return getPersonById(id)
    } catch (e) {
      logIpcError('person:getById', e)
      return { success: false, error: (e as Error).message }
    }
  })

  ipcMain.handle('person:list', async (_event, filter?: PersonFilter): Promise<Result<Person[]>> => {
    try {
      return listPersons(filter)
    } catch (e) {
      logIpcError('person:list', e)
      return { success: false, error: (e as Error).message }
    }
  })

  ipcMain.handle('person:toggleFavorite', async (_event, id: string): Promise<Result<Person>> => {
    try {
      return togglePersonFavorite(id)
    } catch (e) {
      logIpcError('person:toggleFavorite', e)
      return { success: false, error: (e as Error).message }
    }
  })

  const MAX_AVATAR_SIZE = 10 * 1024 * 1024

  ipcMain.handle('person:uploadAvatar', async (_event, personId: string, base64Data: string): Promise<Result<string>> => {
    try {
      const avatarsDir = path.join(app.getPath('userData'), 'avatars')
      if (!fs.existsSync(avatarsDir)) {
        await fs.promises.mkdir(avatarsDir, { recursive: true })
      }
      const avatarPath = path.join(avatarsDir, `${personId}.jpg`)
      const base64Content = base64Data.replace(/^data:image\/\w+;base64,/, '')
      const buffer = Buffer.from(base64Content, 'base64')
      if (buffer.length > MAX_AVATAR_SIZE) {
        return { success: false, error: '头像大小超过10MB限制' }
      }
      await fs.promises.writeFile(avatarPath, buffer)
      const updateResult = updatePerson(personId, { avatar_path: avatarPath })
      if (!updateResult.success) {
        return { success: false, error: updateResult.error }
      }
      return { success: true, data: avatarPath }
    } catch (e) {
      logIpcError('person:uploadAvatar', e)
      return { success: false, error: (e as Error).message }
    }
  })

  ipcMain.handle('person:getAvatarDataUrl', async (_event, personId: string): Promise<Result<string | null>> => {
    try {
      const avatarsDir = path.join(app.getPath('userData'), 'avatars')
      const avatarPath = path.join(avatarsDir, `${personId}.jpg`)
      if (!fs.existsSync(avatarPath)) return { success: true, data: null }
      const buffer = await fs.promises.readFile(avatarPath)
      const ext = path.extname(avatarPath).toLowerCase().replace('.', '')
      const mime = ext === 'png' ? 'image/png' : ext === 'gif' ? 'image/gif' : 'image/jpeg'
      return { success: true, data: `data:${mime};base64,${buffer.toString('base64')}` }
    } catch (e) {
      logIpcError('person:getAvatarDataUrl', e)
      return { success: false, error: (e as Error).message }
    }
  })

  ipcMain.handle('person:setMainIdentity', async (_event, id: string): Promise<Result<Person>> => {
    try {
      return setPersonMainIdentity(id)
    } catch (e) {
      logIpcError('person:setMainIdentity', e)
      return { success: false, error: (e as Error).message }
    }
  })

  ipcMain.handle('person:getMainIdentity', async (): Promise<Result<Person | null>> => {
    try {
      return getMainPerson()
    } catch (e) {
      logIpcError('person:getMainIdentity', e)
      return { success: false, error: (e as Error).message }
    }
  })
}
