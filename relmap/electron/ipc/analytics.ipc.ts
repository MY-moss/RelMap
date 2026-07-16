import { ipcMain } from 'electron'
import {
  getLifecycleDistribution,
  getMonthlyInteractionTrend,
  getNetworkStats,
  getTopPurposes,
  getContactGrowth,
  getInteractionHeatmap,
  getActivityDistribution,
  getTopRelationships,
} from '../../src/main/db/repositories/analytics.repo'
import type {
  Result,
  LifecycleDistribution,
  MonthlyTrend,
  NetworkStats,
  TopPurpose,
  ContactGrowth,
  InteractionHeatmapItem,
  ActivityDistribution,
  TopRelationship,
} from '../../src/shared/types'
export function registerAnalyticsIPC(): void {
  ipcMain.handle('analytics:getLifecycleDistribution', async (): Promise<Result<LifecycleDistribution[]>> => {
    try {
      return getLifecycleDistribution()
    } catch (e) {
      logIpcError('analytics:getLifecycleDistribution', e)
      return { success: false, error: (e as Error).message }
    }
  })

  ipcMain.handle('analytics:getMonthlyInteractionTrend', async (_event, months: number): Promise<Result<MonthlyTrend[]>> => {
    try {
      const validatedMonths = typeof months === 'number' && months > 0 && months <= 120 ? Math.floor(months) : 12
      return getMonthlyInteractionTrend(validatedMonths)
    } catch (e) {
      logIpcError('analytics:getMonthlyInteractionTrend', e)
      return { success: false, error: (e as Error).message }
    }
  })

  ipcMain.handle('analytics:getNetworkStats', async (): Promise<Result<NetworkStats>> => {
    try {
      return getNetworkStats()
    } catch (e) {
      logIpcError('analytics:getNetworkStats', e)
      return { success: false, error: (e as Error).message }
    }
  })

  ipcMain.handle('analytics:getTopPurposes', async (): Promise<Result<TopPurpose[]>> => {
    try {
      return getTopPurposes()
    } catch (e) {
      logIpcError('analytics:getTopPurposes', e)
      return { success: false, error: (e as Error).message }
    }
  })

  ipcMain.handle('analytics:getContactGrowth', async (_event, months: number): Promise<Result<ContactGrowth[]>> => {
    try {
      const validatedGrowthMonths = typeof months === 'number' && months > 0 && months <= 120 ? Math.floor(months) : 12
      return getContactGrowth(validatedGrowthMonths)
    } catch (e) {
      logIpcError('analytics:getContactGrowth', e)
      return { success: false, error: (e as Error).message }
    }
  })

  ipcMain.handle('analytics:getInteractionHeatmap', async (_event, months: number): Promise<Result<InteractionHeatmapItem[]>> => {
    try {
      const validatedHeatmapMonths = typeof months === 'number' && months > 0 && months <= 120 ? Math.floor(months) : 12
      return getInteractionHeatmap(validatedHeatmapMonths)
    } catch (e) {
      logIpcError('analytics:getInteractionHeatmap', e)
      return { success: false, error: (e as Error).message }
    }
  })

  ipcMain.handle('analytics:getActivityDistribution', async (): Promise<Result<ActivityDistribution[]>> => {
    try {
      return getActivityDistribution()
    } catch (e) {
      logIpcError('analytics:getActivityDistribution', e)
      return { success: false, error: (e as Error).message }
    }
  })

  ipcMain.handle('analytics:getTopRelationships', async (_event, limit: number): Promise<Result<TopRelationship[]>> => {
    try {
      const validatedLimit = typeof limit === 'number' && limit > 0 && limit <= 1000 ? Math.floor(limit) : 50
      return getTopRelationships(validatedLimit)
    } catch (e) {
      logIpcError('analytics:getTopRelationships', e)
      return { success: false, error: (e as Error).message }
    }
  })
}
