import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import type { CreateGroupDto, UpdateGroupDto } from '../shared/types'
import { groupKeys } from './queryKeys'

export function useGroupList() {
  return useQuery({
    queryKey: groupKeys.lists(),
    queryFn: async () => {
      const result = await window.electronAPI.group.list()
      if (!result.success) throw new Error(result.error)
      return result.data
    },
    staleTime: 30_000,
  })
}

export function useGroup(id: string) {
  return useQuery({
    queryKey: groupKeys.detail(id),
    queryFn: async () => {
      const result = await window.electronAPI.group.getById(id)
      if (!result.success) throw new Error(result.error)
      return result.data
    },
    enabled: !!id,
  })
}

export function useGroupMembers(groupId: string) {
  return useQuery({
    queryKey: groupKeys.members(groupId),
    queryFn: async () => {
      const result = await window.electronAPI.group.listMembers(groupId)
      if (!result.success) throw new Error(result.error)
      return result.data
    },
    enabled: !!groupId,
  })
}

export function usePersonGroups(personId: string) {
  return useQuery({
    queryKey: groupKeys.byPerson(personId),
    queryFn: async () => {
      const result = await window.electronAPI.group.listPersonGroups(personId)
      if (!result.success) throw new Error(result.error)
      return result.data
    },
    enabled: !!personId,
  })
}

export function useCreateGroup() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (data: CreateGroupDto) => {
      const result = await window.electronAPI.group.create(data)
      if (!result.success) throw new Error(result.error)
      return result.data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: groupKeys.lists() })
    },
  })
}

export function useUpdateGroup() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, data }: { id: string; data: UpdateGroupDto }) => {
      const result = await window.electronAPI.group.update(id, data)
      if (!result.success) throw new Error(result.error)
      return result.data
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: groupKeys.all })
    },
  })
}

export function useDeleteGroup() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (id: string) => {
      const result = await window.electronAPI.group.delete(id)
      if (!result.success) throw new Error(result.error)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: groupKeys.lists() })
    },
  })
}
