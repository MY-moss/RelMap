import { ipcMain } from 'electron'
import { logIpcError } from '../logger'
import {
  importPhotos,
  deletePhoto,
  batchDeletePhotos,
  linkPersonToPhoto,
  getPersonPhotos,
  listAllPhotos,
} from '../../src/main/db/repositories/photos.repo'
import type { Photo, Result } from '../../src/shared/types'

export function registerPhotoIPC(): void {
  ipcMain.handle('photo:import', async (_event, paths: string[]): Promise<Result<Photo[]>> => {
    try {
      return importPhotos(paths)
    } catch (e) {
      logIpcError('photo:import', e)
      return { success: false, error: (e as Error).message }
    }
  })

  ipcMain.handle('photo:delete', async (_event, id: string): Promise<Result<void>> => {
    try {
      return deletePhoto(id)
    } catch (e) {
      logIpcError('photo:delete', e)
      return { success: false, error: (e as Error).message }
    }
  })

  ipcMain.handle('photo:batchDelete', async (_event, ids: string[]): Promise<Result<void>> => {
    try {
      return batchDeletePhotos(ids)
    } catch (e) {
      logIpcError('photo:batchDelete', e)
      return { success: false, error: (e as Error).message }
    }
  })

  ipcMain.handle(
    'photo:linkPerson',
    async (_event, photoId: string, personIds: string[]): Promise<Result<void>> => {
      try {
        return linkPersonToPhoto(photoId, personIds)
      } catch (e) {
      logIpcError('photo:linkPerson', e)
      return { success: false, error: (e as Error).message }
    }
  })

  ipcMain.handle(
    'photo:getPersonPhotos',
    async (_event, personId: string): Promise<Result<Photo[]>> => {
      try {
        return getPersonPhotos(personId)
      } catch (e) {
        return { success: false, error: (e as Error).message }
      }
    }
  )

  ipcMain.handle(
    'photo:listAll',
    async (_event, limit?: number, offset?: number): Promise<Result<Photo[]>> => {
      try {
        return listAllPhotos(limit, offset)
      } catch (e) {
      logIpcError('photo:listAll', e)
      return { success: false, error: (e as Error).message }
    }
  })
}
