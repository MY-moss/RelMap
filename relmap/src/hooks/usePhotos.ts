import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { photoKeys } from './queryKeys'

export function usePersonPhotos(personId: string, isActive = true) {
  return useQuery({
    queryKey: photoKeys.byPerson(personId),
    queryFn: async () => {
      const result = await window.electronAPI.photo.getPersonPhotos(personId)
      if (!result.success) throw new Error(result.error)
      return result.data
    },
    enabled: !!personId && isActive,
  })
}

export function usePhotoList(limit?: number, offset?: number) {
  return useQuery({
    queryKey: photoKeys.list(limit, offset),
    queryFn: async () => {
      const result = await window.electronAPI.photo.listAll(limit, offset)
      if (!result.success) throw new Error(result.error)
      return result.data
    },
    staleTime: 30_000,
  })
}

export function useImportPhotos() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (paths: string[]) => {
      const result = await window.electronAPI.photo.import(paths)
      if (!result.success) throw new Error(result.error)
      return result.data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: photoKeys.all })
    },
  })
}

export function useDeletePhoto() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (id: string) => {
      const result = await window.electronAPI.photo.delete(id)
      if (!result.success) throw new Error(result.error)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: photoKeys.all })
    },
  })
}

export function useLinkPersonPhoto() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async ({ photoId, personIds }: { photoId: string; personIds: string[] }) => {
      const result = await window.electronAPI.photo.linkPerson(photoId, personIds)
      if (!result.success) throw new Error(result.error)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: photoKeys.all })
    },
  })
}
