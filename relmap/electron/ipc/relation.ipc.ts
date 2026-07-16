import { ipcMain } from 'electron'
import {
  createRelationship,
  updateRelationship,
  deleteRelationship,
  getPersonRelations,
  getGraphData,
  getIntimacyDistribution,
} from '../../src/main/db/repositories/relationships.repo'
import { getPersonById } from '../../src/main/db/repositories/person.repo'
import { createReminder } from '../../src/main/db/repositories/reminders.repo'
import type {
  Result,
  CreateRelationDto,
  UpdateRelationDto,
  Relationship,
  GraphData,
  IntimacyDistribution,
} from '../../src/shared/types'

/** 注册关系管理相关 IPC handler */
export function registerRelationIPC(): void {
  ipcMain.handle(
    'relation:create',
    async (_event, data: CreateRelationDto): Promise<Result<Relationship>> => {
      try {
        const result = createRelationship(data)
        if (result.success && data.meet_date) {
          const personResult = getPersonById(data.person_id)
          const relatedResult = getPersonById(data.related_person_id)
          const personName = personResult.success ? personResult.data.name : '未知'
          const relatedName = relatedResult.success ? relatedResult.data.name : '未知'
          createReminder({
            person_id: data.person_id,
            title: `${personName} 和 ${relatedName} 的纪念日`,
            remind_date: data.meet_date,
            repeat_type: 'yearly',
            note: `自动为${personName}和${relatedName}创建的纪念日提醒（认识日期）`,
          })
        }
        return result
      } catch (e) {
      logIpcError('relation:create', e)
      return { success: false, error: (e as Error).message }
    }
  },
  )

  ipcMain.handle(
    'relation:update',
    async (
      _event,
      id: string,
      data: UpdateRelationDto,
    ): Promise<Result<Relationship>> => {
      try {
        return updateRelationship(id, data)
      } catch (e) {
      logIpcError('relation:update', e)
      return { success: false, error: (e as Error).message }
    }
  },
  )

  ipcMain.handle(
    'relation:delete',
    async (_event, id: string): Promise<Result<void>> => {
      try {
        return deleteRelationship(id)
      } catch (e) {
      logIpcError('relation:delete', e)
      return { success: false, error: (e as Error).message }
    }
  },
  )

  ipcMain.handle(
    'relation:getPersonRelations',
    async (_event, personId: string): Promise<Result<Relationship[]>> => {
      try {
        return getPersonRelations(personId)
      } catch (e) {
      logIpcError('relation:getPersonRelations', e)
      return { success: false, error: (e as Error).message }
    }
  },
  )

  ipcMain.handle(
    'relation:getGraphData',
    async (_event, minIntimacy?: number, limit?: number): Promise<Result<GraphData>> => {
      try {
        return getGraphData(minIntimacy, limit)
      } catch (e) {
      logIpcError('relation:getGraphData', e)
      return { success: false, error: (e as Error).message }
    }
  },
  )

  ipcMain.handle(
    'relation:getIntimacyDistribution',
    async (): Promise<Result<IntimacyDistribution[]>> => {
      try {
        return getIntimacyDistribution()
      } catch (e) {
      logIpcError('relation:getIntimacyDistribution', e)
      return { success: false, error: (e as Error).message }
    }
  })
}
