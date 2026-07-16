import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import type { CreateRelationDto, UpdateRelationDto } from '../shared/types'
import { relationKeys } from './queryKeys'

export function usePersonRelations(personId: string, isActive = true) {
  return useQuery({
    queryKey: relationKeys.list(personId),
    queryFn: async () => {
      const result = await window.electronAPI.relation.getPersonRelations(personId)
      if (!result.success) throw new Error(result.error)
      // Collect both person_id and related_person_id because the current person
      // could be on either side of the relationship
      const allIds = new Set<string>()
      for (const rel of result.data) {
        allIds.add(rel.person_id)
        allIds.add(rel.related_person_id)
      }
      const uniqueIds = [...allIds]
      const personResults = await Promise.all(
        uniqueIds.map((pid) => window.electronAPI.person.getById(pid))
      )
      const nameMap = new Map<string, string>()
      personResults.forEach((res, i) => {
        nameMap.set(uniqueIds[i], res.success ? res.data.name : '未知')
      })
      return result.data.map((rel) => {
        // Determine the "other" person — whichever id is NOT the current personId
        const otherId = rel.person_id === personId ? rel.related_person_id : rel.person_id
        return {
          ...rel,
          related_person_id: otherId,
          related_person_name: nameMap.get(otherId) ?? '未知',
        }
      })
    },
    staleTime: 30_000,
    enabled: !!personId && isActive,
  })
}

export function useGraphData(minIntimacy?: number, limit?: number) {
  return useQuery({
    queryKey: relationKeys.graph(minIntimacy, limit),
    queryFn: async () => {
      const result = await window.electronAPI.relation.getGraphData(minIntimacy, limit)
      if (!result.success) throw new Error(result.error)
      return result.data
    },
    staleTime: 30_000,
  })
}

export function useIntimacyDistribution() {
  return useQuery({
    queryKey: relationKeys.distribution(),
    queryFn: async () => {
      const result = await window.electronAPI.relation.getIntimacyDistribution()
      if (!result.success) throw new Error(result.error)
      return result.data
    },
    staleTime: 60_000,
  })
}

export function useCreateRelation() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (data: CreateRelationDto) => {
      const result = await window.electronAPI.relation.create(data)
      if (!result.success) throw new Error(result.error)
      return result.data
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: relationKeys.list(data.person_id) })
      queryClient.invalidateQueries({ queryKey: relationKeys.graph() })
      queryClient.invalidateQueries({ queryKey: relationKeys.distribution() })
    },
  })
}

export function useUpdateRelation() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, data }: { id: string; data: UpdateRelationDto }) => {
      const result = await window.electronAPI.relation.update(id, data)
      if (!result.success) throw new Error(result.error)
      return result.data
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: relationKeys.all })
    },
  })
}

export function useDeleteRelation() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (id: string) => {
      const result = await window.electronAPI.relation.delete(id)
      if (!result.success) throw new Error(result.error)
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: relationKeys.all })
      queryClient.invalidateQueries({ queryKey: relationKeys.distribution() })
    },
  })
}
