import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import type { FollowUpFilter, CreateFollowUpDto, UpdateFollowUpDto } from '../shared/types'
import { followUpKeys } from './queryKeys'

export function useFollowUpList(filter?: FollowUpFilter) {
  return useQuery({
    queryKey: followUpKeys.list(filter as Record<string, unknown> | undefined),
    queryFn: async () => {
      const result = await window.electronAPI.followUp.list(filter)
      if (!result.success) throw new Error(result.error)
      return result.data
    },
    staleTime: 30_000,
  })
}

export function useFollowUpById(id: string) {
  return useQuery({
    queryKey: ['followUp', 'detail', id],
    queryFn: async () => {
      const result = await window.electronAPI.followUp.getById(id)
      if (!result.success) throw new Error(result.error)
      return result.data
    },
    staleTime: 30_000,
    enabled: !!id,
  })
}

export function useCreateFollowUp() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (data: CreateFollowUpDto) => {
      const result = await window.electronAPI.followUp.create(data)
      if (!result.success) throw new Error(result.error)
      return result.data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: followUpKeys.all })
    },
  })
}

export function useUpdateFollowUp() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, data }: { id: string; data: UpdateFollowUpDto }) => {
      const result = await window.electronAPI.followUp.update(id, data)
      if (!result.success) throw new Error(result.error)
      return result.data
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: followUpKeys.all })
    },
  })
}

export function useDeleteFollowUp() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (id: string) => {
      const result = await window.electronAPI.followUp.delete(id)
      if (!result.success) throw new Error(result.error)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: followUpKeys.all })
    },
  })
}