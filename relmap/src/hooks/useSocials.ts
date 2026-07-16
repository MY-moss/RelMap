import { useMutation, useQueryClient } from '@tanstack/react-query'
import type { CreateSocialAccountDto, UpdateSocialAccountDto } from '../shared/types'
import { socialKeys } from './queryKeys'

export function useSocialList(personId: string) {
  const queryClient = useQueryClient()
  const cached = queryClient.getQueryData(socialKeys.byPerson(personId))
  return { data: cached, refetch: () => queryClient.invalidateQueries({ queryKey: socialKeys.byPerson(personId) }) }
}

export function useCreateSocial() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (data: CreateSocialAccountDto) => {
      const result = await window.electronAPI.social.create(data)
      if (!result.success) throw new Error(result.error)
      return result.data
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: socialKeys.byPerson(data.person_id) })
    },
  })
}

export function useUpdateSocial() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, data }: { id: string; data: UpdateSocialAccountDto }) => {
      const result = await window.electronAPI.social.update(id, data)
      if (!result.success) throw new Error(result.error)
      return result.data
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: socialKeys.all })
    },
  })
}

export function useDeleteSocial() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (id: string) => {
      const result = await window.electronAPI.social.delete(id)
      if (!result.success) throw new Error(result.error)
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: socialKeys.all })
    },
  })
}
