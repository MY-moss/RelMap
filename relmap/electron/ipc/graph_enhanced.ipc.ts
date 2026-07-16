import { ipcMain } from 'electron'
import { getDb } from '../../src/main/db/connection'
import { getLouvainCommunities } from '../../src/main/ai/smart_grouping'
import type { Result, NodeDetail, CommunityInfo, Person, Relationship } from '../../src/shared/types'
import { logger } from '../logger'

let communitiesCache: { result: Result<CommunityInfo[]>; timestamp: number } | null = null
const CACHE_TTL_MS = 5 * 60 * 1000 // 5 minutes

function getCachedCommunities(): Result<CommunityInfo[]> {
  if (communitiesCache && Date.now() - communitiesCache.timestamp < CACHE_TTL_MS) {
    return communitiesCache.result
  }
  const result = getLouvainCommunities()
  communitiesCache = { result, timestamp: Date.now() }
  return result
}

export function registerGraphEnhancedIPC(): void {
  ipcMain.handle('graph:getNodeDetails', async (_event, personId: string): Promise<Result<NodeDetail>> => {
    try {
      const db = getDb()
      const person = db.prepare('SELECT * FROM persons WHERE id = ?').get(personId) as Person | undefined
      if (!person) return { success: false, error: `联系人 ${personId} 不存在` }

      const relRows = db.prepare(`
        SELECT r.*, p.name AS related_name
        FROM relationships r
        JOIN persons p ON (p.id = CASE WHEN r.person_id = ? THEN r.related_person_id ELSE r.person_id END)
        WHERE r.person_id = ? OR r.related_person_id = ?
      `).all(personId, personId, personId) as (Relationship & { related_name: string })[]

      const relationships = relRows.map(r => ({
        personId: r.person_id === personId ? r.related_person_id : r.person_id,
        personName: r.related_name,
        intimacy: r.intimacy,
        label: r.relation_label ?? undefined,
      }))
      const maxIntimacy = relationships.reduce((max, r) => Math.max(max, r.intimacy), 0)

      const commResult = getCachedCommunities()
      let communityId: number | undefined
      let communityName: string | undefined
      if (commResult.success) {
        for (const comm of commResult.data) {
          if (comm.memberIds.includes(personId)) {
            communityId = comm.communityId
            communityName = comm.communityName
            break
          }
        }
      }

      return {
        success: true,
        data: { person, intimacy: maxIntimacy, relationships, communityId, communityName },
      }
    } catch (e) {
      return { success: false, error: (e as Error).message }
    }
  })

  ipcMain.handle('graph:getCommunities', async (): Promise<Result<CommunityInfo[]>> => {
    try {
      return getCachedCommunities()
    } catch (e) {
      logger.error({ err: e, ipc: 'graph:getCommunities' }, 'IPC handler error')
      return { success: false, error: (e as Error).message }
    }
  })
}
