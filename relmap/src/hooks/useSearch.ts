import { useQuery } from '@tanstack/react-query'
import { searchKeys } from './queryKeys'

export function useGlobalSearch(query: string) {
  return useQuery({
    queryKey: searchKeys.global(query),
    queryFn: async () => {
      const result = await window.electronAPI.search.global(query)
      if (!result.success) throw new Error(result.error)
      return result.data
    },
    enabled: query.trim().length >= 2,
    staleTime: 15_000,
  })
}
