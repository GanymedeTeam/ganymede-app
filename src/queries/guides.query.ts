import { queryOptions } from '@tanstack/react-query'
import { getFlatGuides, getGuides } from '@/ipc/guides.ts'

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
  })
}
