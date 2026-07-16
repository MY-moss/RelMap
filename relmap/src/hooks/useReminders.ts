import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import type { ReminderFilter, CreateReminderDto, UpdateReminderDto } from '../shared/types'
import { reminderKeys } from './queryKeys'

export function useReminderList(filter?: ReminderFilter) {
  return useQuery({
    queryKey: reminderKeys.list(filter as Record<string, unknown> | undefined),
    queryFn: async () => {
      const result = await window.electronAPI.reminder.list(filter)
      if (!result.success) throw new Error(result.error)
      return result.data
    },
    staleTime: 30_000,
  })
}

export function useUpcomingReminders(days: number) {
  return useQuery({
    queryKey: reminderKeys.upcoming(days),
    queryFn: async () => {
      const result = await window.electronAPI.reminder.upcoming(days)
      if (!result.success) throw new Error(result.error)
      return result.data
    },
    staleTime: 30_000,
  })
}

export function useCreateReminder() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (data: CreateReminderDto) => {
      const result = await window.electronAPI.reminder.create(data)
      if (!result.success) throw new Error(result.error)
      return result.data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: reminderKeys.all })
    },
  })
}

export function useUpdateReminder() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, data }: { id: string; data: UpdateReminderDto }) => {
      const result = await window.electronAPI.reminder.update(id, data)
      if (!result.success) throw new Error(result.error)
      return result.data
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: reminderKeys.all })
    },
  })
}

export function useDeleteReminder() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (id: string) => {
      const result = await window.electronAPI.reminder.delete(id)
      if (!result.success) throw new Error(result.error)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: reminderKeys.all })
    },
  })
}
