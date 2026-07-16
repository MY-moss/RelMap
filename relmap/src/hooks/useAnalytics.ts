import { useQuery, useQueryClient } from '@tanstack/react-query'

export const analyticsKeys = {
  all: ['analytics'] as const,
  lifecycleDistribution: () => [...analyticsKeys.all, 'lifecycleDistribution'] as const,
  monthlyInteractionTrend: (months: number) => [...analyticsKeys.all, 'monthlyInteractionTrend', months] as const,
  networkStats: () => [...analyticsKeys.all, 'networkStats'] as const,
  topPurposes: () => [...analyticsKeys.all, 'topPurposes'] as const,
  contactGrowth: (months: number) => [...analyticsKeys.all, 'contactGrowth', months] as const,
  interactionHeatmap: (months: number) => [...analyticsKeys.all, 'interactionHeatmap', months] as const,
  activityDistribution: () => [...analyticsKeys.all, 'activityDistribution'] as const,
  topRelationships: (limit: number) => [...analyticsKeys.all, 'topRelationships', limit] as const,
}

export function useLifecycleDistribution() {
  return useQuery({
    queryKey: analyticsKeys.lifecycleDistribution(),
    queryFn: async () => {
      const result = await window.electronAPI.analytics.getLifecycleDistribution()
      if (!result.success) throw new Error(result.error)
      return result.data
    },
    staleTime: 300_000,
  })
}

export function useMonthlyInteractionTrend(months: number = 12) {
  return useQuery({
    queryKey: analyticsKeys.monthlyInteractionTrend(months),
    queryFn: async () => {
      const result = await window.electronAPI.analytics.getMonthlyInteractionTrend(months)
      if (!result.success) throw new Error(result.error)
      return result.data
    },
    staleTime: 300_000,
  })
}

export function useNetworkStats() {
  return useQuery({
    queryKey: analyticsKeys.networkStats(),
    queryFn: async () => {
      const result = await window.electronAPI.analytics.getNetworkStats()
      if (!result.success) throw new Error(result.error)
      return result.data
    },
    staleTime: 300_000,
  })
}

export function useTopPurposes() {
  return useQuery({
    queryKey: analyticsKeys.topPurposes(),
    queryFn: async () => {
      const result = await window.electronAPI.analytics.getTopPurposes()
      if (!result.success) throw new Error(result.error)
      return result.data
    },
    staleTime: 300_000,
  })
}

export function useContactGrowth(months: number = 12) {
  return useQuery({
    queryKey: analyticsKeys.contactGrowth(months),
    queryFn: async () => {
      const result = await window.electronAPI.analytics.getContactGrowth(months)
      if (!result.success) throw new Error(result.error)
      return result.data
    },
    staleTime: 300_000,
  })
}

export function useInteractionHeatmap(months: number = 3) {
  return useQuery({
    queryKey: analyticsKeys.interactionHeatmap(months),
    queryFn: async () => {
      const result = await window.electronAPI.analytics.getInteractionHeatmap(months)
      if (!result.success) throw new Error(result.error)
      return result.data
    },
    staleTime: 300_000,
  })
}

export function useActivityDistribution() {
  return useQuery({
    queryKey: analyticsKeys.activityDistribution(),
    queryFn: async () => {
      const result = await window.electronAPI.analytics.getActivityDistribution()
      if (!result.success) throw new Error(result.error)
      return result.data
    },
    staleTime: 300_000,
  })
}

export function useTopRelationships(limit: number = 10) {
  return useQuery({
    queryKey: analyticsKeys.topRelationships(limit),
    queryFn: async () => {
      const result = await window.electronAPI.analytics.getTopRelationships(limit)
      if (!result.success) throw new Error(result.error)
      return result.data
    },
    staleTime: 300_000,
  })
}

export function useInvalidateAnalytics() {
  const queryClient = useQueryClient()
  return () => queryClient.invalidateQueries({ queryKey: analyticsKeys.all })
}
