import { queryOptions } from '@tanstack/react-query'
import { getFlatGuides, getGuides } from '@/ipc/guides.ts'

// 5 minutes ? à tester
const GUIDES_STALE_TIME = 1000 * 60 * 5

export function guidesQuery(folder = '') {
  return queryOptions({
    queryKey: ['conf', 'guides', folder],
    queryFn: async () => {
      const guides = await getFlatGuides(folder)

      if (guides.isErr()) {
        throw guides.error
      }

      return guides.value
    },
    staleTime: GUIDES_STALE_TIME,
  })
}

export function guidesInFolderQuery(folder?: string) {
  return queryOptions({
    queryKey: ['conf', 'guides_in_folder', folder ?? -1],
    queryFn: async () => {
      const guides = await getGuides(folder)

      if (guides.isErr()) {
        throw guides.error
      }

      return guides.value
    },
    staleTime: GUIDES_STALE_TIME,
  })
}
