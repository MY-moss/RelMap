import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import type { DiaryFilter, CreateDiaryDto, UpdateDiaryDto } from '../shared/types'
import { diaryKeys } from './queryKeys'

export function useDiaryList(filter?: DiaryFilter, isActive = true) {
  return useQuery({
    queryKey: diaryKeys.list(filter as Record<string, unknown> | undefined),
    queryFn: async () => {
      const result = await window.electronAPI.diary.list(filter)
      if (!result.success) throw new Error(result.error)
      return result.data
    },
    staleTime: 30_000,
    enabled: isActive,
  })
}

export function useCreateDiary() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (data: CreateDiaryDto) => {
      const result = await window.electronAPI.diary.create(data)
      if (!result.success) throw new Error(result.error)
      return result.data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: diaryKeys.lists() })
    },
  })
}

export function useUpdateDiary() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, data }: { id: string; data: UpdateDiaryDto }) => {
      const result = await window.electronAPI.diary.update(id, data)
      if (!result.success) throw new Error(result.error)
      return result.data
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: diaryKeys.lists() })
    },
  })
}

export function useDeleteDiary() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (id: string) => {
      const result = await window.electronAPI.diary.delete(id)
      if (!result.success) throw new Error(result.error)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: diaryKeys.lists() })
    },
  })
}
