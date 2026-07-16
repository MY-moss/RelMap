import { ipcMain } from 'electron'
import { logIpcError } from '../logger'
import type {
  Result,
  SocialAccount,
  CreateSocialAccountDto,
  UpdateSocialAccountDto,
} from '../../src/shared/types'
import {
  createSocialAccount,
  updateSocialAccount,
  deleteSocialAccount,
  listSocialAccountsByPerson,
  setSocialAccountPrimary,
} from '../../src/main/db/repositories/social_accounts.repo'

export function registerSocialIPC(): void {
  ipcMain.handle('social:create', async (_event, data: CreateSocialAccountDto): Promise<Result<SocialAccount>> => {
    try {
      return createSocialAccount(data)
    } catch (e) {
      logIpcError('social:create', e)
      return { success: false, error: (e as Error).message }
    }
  })

  ipcMain.handle('social:update', async (_event, id: string, data: UpdateSocialAccountDto): Promise<Result<SocialAccount>> => {
    try {
      return updateSocialAccount(id, data)
    } catch (e) {
      logIpcError('social:update', e)
      return { success: false, error: (e as Error).message }
    }
  })

  ipcMain.handle('social:delete', async (_event, id: string): Promise<Result<void>> => {
    try {
      return deleteSocialAccount(id)
    } catch (e) {
      logIpcError('social:delete', e)
      return { success: false, error: (e as Error).message }
    }
  })

  ipcMain.handle('social:listByPerson', async (_event, personId: string): Promise<Result<SocialAccount[]>> => {
    try {
      return listSocialAccountsByPerson(personId)
    } catch (e) {
      logIpcError('social:listByPerson', e)
      return { success: false, error: (e as Error).message }
    }
  })

  ipcMain.handle('social:setPrimary', async (_event, id: string): Promise<Result<SocialAccount>> => {
    try {
      return setSocialAccountPrimary(id)
    } catch (e) {
      logIpcError('social:setPrimary', e)
      return { success: false, error: (e as Error).message }
    }
  })
}
