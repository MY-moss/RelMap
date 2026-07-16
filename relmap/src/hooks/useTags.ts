import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import type { CreateTagDto, UpdateTagDto, TagTargetType } from '../shared/types'
import { tagKeys } from './queryKeys'

export function useTagList() {
  return useQuery({
    queryKey: tagKeys.lists(),
    queryFn: async () => {
      const result = await window.electronAPI.tag.list()
      if (!result.success) throw new Error(result.error)
      return result.data
    },
    staleTime: 30_000,
  })
}

export function useTagsByTarget(targetId: string, targetType: TagTargetType) {
  return useQuery({
    queryKey: tagKeys.byTarget(targetId, targetType),
    queryFn: async () => {
      const result = await window.electronAPI.tag.listByTarget(targetId, targetType)
      if (!result.success) throw new Error(result.error)
      return result.data
    },
    enabled: !!targetId,
  })
}

export function useCreateTag() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (data: CreateTagDto) => {
      const result = await window.electronAPI.tag.create(data)
      if (!result.success) throw new Error(result.error)
      return result.data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: tagKeys.lists() })
    },
  })
}

export function useUpdateTag() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, data }: { id: string; data: UpdateTagDto }) => {
      const result = await window.electronAPI.tag.update(id, data)
      if (!result.success) throw new Error(result.error)
      return result.data
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: tagKeys.all })
    },
  })
}

export function useDeleteTag() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (id: string) => {
      const result = await window.electronAPI.tag.delete(id)
      if (!result.success) throw new Error(result.error)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: tagKeys.lists() })
    },
  })
}

export function useApplyTag() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async ({ tagId, targetId, targetType }: { tagId: string; targetId: string; targetType: TagTargetType }) => {
      const result = await window.electronAPI.tag.apply(tagId, targetId, targetType)
      if (!result.success) throw new Error(result.error)
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: tagKeys.byTarget(variables.targetId, variables.targetType) })
    },
  })
}

export function useRemoveTag() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async ({ tagId, targetId, targetType }: { tagId: string; targetId: string; targetType: TagTargetType }) => {
      const result = await window.electronAPI.tag.remove(tagId, targetId, targetType)
      if (!result.success) throw new Error(result.error)
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: tagKeys.byTarget(variables.targetId, variables.targetType) })
    },
  })
}
