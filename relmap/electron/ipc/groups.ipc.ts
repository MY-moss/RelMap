import { ipcMain } from 'electron'
import { logIpcError } from '../logger'
import type { Result, Group, Person } from '../../src/shared/types'
import {
  createGroup,
  updateGroup,
  deleteGroup,
  getGroupById,
  listGroups,
  addGroupMembers,
  removeGroupMember,
  listGroupMembers,
  listPersonGroups,
} from '../../src/main/db/repositories/groups.repo'
export function registerGroupIPC(): void {
  ipcMain.handle('group:create', async (_event, data: {
    name: string
    description?: string
    color?: string
  }): Promise<Result<Group>> => {
    try {
      return createGroup(data)
    } catch (e) {
      logIpcError('group:create', e)
      return { success: false, error: (e as Error).message }
    }
  })

  ipcMain.handle(
    'group:update',
    async (
      _event,
      id: string,
      data: Partial<{ name: string; description?: string; color?: string }>
    ): Promise<Result<Group>> => {
      try {
        return updateGroup(id, data)
      } catch (e) {
      logIpcError('group:update', e)
      return { success: false, error: (e as Error).message }
    }
  })

  ipcMain.handle('group:delete', async (_event, id: string): Promise<Result<void>> => {
    try {
      return deleteGroup(id)
    } catch (e) {
      logIpcError('group:delete', e)
      return { success: false, error: (e as Error).message }
    }
  })

  ipcMain.handle('group:getById', async (_event, id: string): Promise<Result<Group>> => {
    try {
      return getGroupById(id)
    } catch (e) {
      logIpcError('group:getById', e)
      return { success: false, error: (e as Error).message }
    }
  })

  ipcMain.handle('group:list', async (): Promise<Result<Group[]>> => {
    try {
      return listGroups()
    } catch (e) {
      logIpcError('group:list', e)
      return { success: false, error: (e as Error).message }
    }
  })

  ipcMain.handle(
    'group:addMembers',
    async (_event, groupId: string, personIds: string[]): Promise<Result<void>> => {
      try {
        return addGroupMembers(groupId, personIds)
      } catch (e) {
      logIpcError('group:addMembers', e)
      return { success: false, error: (e as Error).message }
    }
  })

  ipcMain.handle(
    'group:removeMember',
    async (_event, groupId: string, personId: string): Promise<Result<void>> => {
      try {
        return removeGroupMember(groupId, personId)
      } catch (e) {
      logIpcError('group:removeMember', e)
      return { success: false, error: (e as Error).message }
    }
  })

  ipcMain.handle(
    'group:listMembers',
    async (_event, groupId: string): Promise<Result<Person[]>> => {
      try {
        return listGroupMembers(groupId)
      } catch (e) {
      logIpcError('group:listMembers', e)
      return { success: false, error: (e as Error).message }
    }
  })

  ipcMain.handle(
    'group:listPersonGroups',
    async (_event, personId: string): Promise<Result<Group[]>> => {
      try {
        return listPersonGroups(personId)
      } catch (e) {
      logIpcError('group:listPersonGroups', e)
      return { success: false, error: (e as Error).message }
    }
  })
}
