import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import type { Person, PersonFilter, CreatePersonDto, UpdatePersonDto } from '../shared/types'
import { personKeys } from './queryKeys'

export function usePersonList(filter?: PersonFilter) {
  return useQuery({
    queryKey: personKeys.list(filter as Record<string, unknown> | undefined),
    queryFn: async () => {
      const result = await window.electronAPI.person.list(filter)
      if (!result.success) throw new Error(result.error)
      return result.data
    },
    staleTime: 30_000,
  })
}

export function usePerson(id: string) {
  return useQuery({
    queryKey: personKeys.detail(id),
    queryFn: async () => {
      const result = await window.electronAPI.person.getById(id)
      if (!result.success) throw new Error(result.error)
      return result.data
    },
    staleTime: 30_000,
    enabled: !!id,
  })
}

export function useCreatePerson() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (data: CreatePersonDto) => {
      const result = await window.electronAPI.person.create(data)
      if (!result.success) throw new Error(result.error)
      return result.data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: personKeys.lists() })
    },
  })
}

export function useUpdatePerson() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, data }: { id: string; data: UpdatePersonDto }) => {
      const result = await window.electronAPI.person.update(id, data)
      if (!result.success) throw new Error(result.error)
      return result.data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: personKeys.lists() })
      queryClient.invalidateQueries({ queryKey: personKeys.details() })
    },
  })
}

export function useDeletePerson() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (id: string) => {
      const result = await window.electronAPI.person.delete(id)
      if (!result.success) throw new Error(result.error)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: personKeys.lists() })
    },
  })
}

export function useToggleFavorite() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (id: string) => {
      const result = await window.electronAPI.person.toggleFavorite(id)
      if (!result.success) throw new Error(result.error)
      return result.data
    },
    onMutate: async (id) => {
      await queryClient.cancelQueries({ queryKey: personKeys.lists() })
      const previousLists = queryClient.getQueriesData<Person[]>({ queryKey: personKeys.lists() })
      queryClient.setQueriesData<Person[]>({ queryKey: personKeys.lists() }, (old) =>
        old?.map((p) => (p.id === id ? { ...p, is_favorite: !p.is_favorite } : p))
      )
      return { previousLists }
    },
    onError: (_err, _id, context) => {
      if (context?.previousLists) {
        for (const [key, data] of context.previousLists) {
          queryClient.setQueryData(key, data)
        }
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: personKeys.lists() })
      queryClient.invalidateQueries({ queryKey: personKeys.details() })
    },
  })
}

export function useSetMainIdentity() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (id: string) => {
      const result = await window.electronAPI.person.setMainIdentity(id)
      if (!result.success) throw new Error(result.error)
      return result.data
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: personKeys.lists() })
      queryClient.invalidateQueries({ queryKey: personKeys.details() })
    },
  })
}

export function useMainPerson() {
  return useQuery({
    queryKey: [...personKeys.all, 'mainIdentity'],
    queryFn: async () => {
      const result = await window.electronAPI.person.getMainIdentity()
      if (!result.success) throw new Error(result.error)
      return result.data
    },
    staleTime: 60_000,
  })
}

export function useUploadAvatar() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async ({ personId, base64Data }: { personId: string; base64Data: string }) => {
      const result = await window.electronAPI.person.uploadAvatar(personId, base64Data)
      if (!result.success) throw new Error(result.error)
      return result.data
    },
    onSettled: (_data, _error, { personId }) => {
      queryClient.invalidateQueries({ queryKey: personKeys.detail(personId) })
      queryClient.invalidateQueries({ queryKey: personKeys.lists() })
    },
  })
}
