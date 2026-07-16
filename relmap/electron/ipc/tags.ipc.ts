import { ipcMain } from 'electron'
import type { Result, Tag, TagTargetType } from '../../src/shared/types'
import {
  createTag,
  updateTag,
  deleteTag,
  getTagById,
  listTags,
  listTagsByParent,
  applyTag,
  removeTag,
  listTagsByTarget,
  listTargetsByTag,
} from '../../src/main/db/repositories/tags.repo'

export function registerTagIPC(): void {
  ipcMain.handle(
    'tag:create',
    async (_event, data: { name: string; color?: string; parent_id?: string }): Promise<Result<Tag>> => {
      try {
        return createTag(data)
      } catch (e) {
        return { success: false, error: (e as Error).message }
      }
    }
  )

  ipcMain.handle(
    'tag:update',
    async (_event, id: string, data: Partial<{ name: string; color: string; parent_id: string | null }>): Promise<Result<Tag>> => {
      try {
        return updateTag(id, data)
      } catch (e) {
        return { success: false, error: (e as Error).message }
      }
    }
  )

  ipcMain.handle('tag:delete', async (_event, id: string): Promise<Result<void>> => {
    try {
      return deleteTag(id)
    } catch (e) {
      return { success: false, error: (e as Error).message }
    }
  })

  ipcMain.handle('tag:getById', async (_event, id: string): Promise<Result<Tag>> => {
    try {
      return getTagById(id)
    } catch (e) {
      return { success: false, error: (e as Error).message }
    }
  })

  ipcMain.handle('tag:list', async (): Promise<Result<Tag[]>> => {
    try {
      return listTags()
    } catch (e) {
      return { success: false, error: (e as Error).message }
    }
  })

  ipcMain.handle(
    'tag:listByParent',
    async (_event, parentId?: string): Promise<Result<Tag[]>> => {
      try {
        return listTagsByParent(parentId)
      } catch (e) {
        return { success: false, error: (e as Error).message }
      }
    }
  )

  ipcMain.handle(
    'tag:apply',
    async (
      _event,
      tagId: string,
      targetId: string,
      targetType: TagTargetType
    ): Promise<Result<void>> => {
      try {
        return applyTag(tagId, targetId, targetType)
      } catch (e) {
        return { success: false, error: (e as Error).message }
      }
    }
  )

  ipcMain.handle(
    'tag:remove',
    async (
      _event,
      tagId: string,
      targetId: string,
      targetType: TagTargetType
    ): Promise<Result<void>> => {
      try {
        return removeTag(tagId, targetId, targetType)
      } catch (e) {
        return { success: false, error: (e as Error).message }
      }
    }
  )

  ipcMain.handle(
    'tag:listByTarget',
    async (
      _event,
      targetId: string,
      targetType: TagTargetType
    ): Promise<Result<Tag[]>> => {
      try {
        return listTagsByTarget(targetId, targetType)
      } catch (e) {
        return { success: false, error: (e as Error).message }
      }
    }
  )

  ipcMain.handle(
    'tag:listTargets',
    async (
      _event,
      tagId: string
    ): Promise<Result<{ target_id: string; target_type: string }[]>> => {
      try {
        return listTargetsByTag(tagId)
      } catch (e) {
        return { success: false, error: (e as Error).message }
      }
    }
  )
}
