import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import type { EventFilter, CreateEventDto, UpdateEventDto } from '../shared/types'
import { eventKeys } from './queryKeys'

export function useEventList(filter?: EventFilter, isActive = true) {
  return useQuery({
    queryKey: eventKeys.list(filter as Record<string, unknown> | undefined),
    queryFn: async () => {
      const result = await window.electronAPI.event.list(filter)
      if (!result.success) throw new Error(result.error)
      return result.data
    },
    staleTime: 30_000,
    enabled: isActive,
  })
}

export function useCreateEvent() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (data: CreateEventDto) => {
      const result = await window.electronAPI.event.create(data)
      if (!result.success) throw new Error(result.error)
      return result.data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: eventKeys.lists() })
    },
  })
}

export function useUpdateEvent() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, data }: { id: string; data: UpdateEventDto }) => {
      const result = await window.electronAPI.event.update(id, data)
      if (!result.success) throw new Error(result.error)
      return result.data
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: eventKeys.lists() })
    },
  })
}

export function useDeleteEvent() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (id: string) => {
      const result = await window.electronAPI.event.delete(id)
      if (!result.success) throw new Error(result.error)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: eventKeys.lists() })
    },
  })
}
