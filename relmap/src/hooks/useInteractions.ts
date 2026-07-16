import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import type { InteractionLogFilter, CreateInteractionLogDto, UpdateInteractionLogDto } from '../shared/types'
import { interactionKeys } from './queryKeys'

export function useInteractionList(filter?: InteractionLogFilter) {
  return useQuery({
    queryKey: interactionKeys.list(filter as Record<string, unknown> | undefined),
    queryFn: async () => {
      const result = await window.electronAPI.interaction.list(filter)
      if (!result.success) throw new Error(result.error)
      return result.data
    },
    staleTime: 30_000,
  })
}

export function useInteractionsByPerson(personId: string, limit?: number) {
  return useQuery({
    queryKey: interactionKeys.byPerson(personId, limit),
    queryFn: async () => {
      const result = await window.electronAPI.interaction.listByPerson(personId, limit)
      if (!result.success) throw new Error(result.error)
      return result.data
    },
    enabled: !!personId,
  })
}

export function useLastInteractionDate(personId: string) {
  return useQuery({
    queryKey: [...interactionKeys.all, 'lastDate', personId] as const,
    queryFn: async () => {
      const result = await window.electronAPI.interaction.lastDate(personId)
      if (!result.success) throw new Error(result.error)
      return result.data
    },
    enabled: !!personId,
  })
}

export function useCreateInteraction() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (data: CreateInteractionLogDto) => {
      const result = await window.electronAPI.interaction.create(data)
      if (!result.success) throw new Error(result.error)
      return result.data
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: interactionKeys.byPerson(data.person_id) })
      queryClient.invalidateQueries({ queryKey: interactionKeys.lists() })
    },
  })
}

export function useUpdateInteraction() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, data }: { id: string; data: UpdateInteractionLogDto }) => {
      const result = await window.electronAPI.interaction.update(id, data)
      if (!result.success) throw new Error(result.error)
      return result.data
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: interactionKeys.all })
    },
  })
}

export function useDeleteInteraction() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (id: string) => {
      const result = await window.electronAPI.interaction.delete(id)
      if (!result.success) throw new Error(result.error)
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: interactionKeys.all })
    },
  })
}
