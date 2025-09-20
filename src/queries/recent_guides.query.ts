import { queryOptions } from '@tanstack/react-query'
import { getRecentGuides } from '@/ipc/guides.ts'

export const recentGuidesQuery = queryOptions({
  queryKey: ['recentGuides'],
  queryFn: async () => {
    const recentGuides = await getRecentGuides()

    if (recentGuides.isErr()) {
      throw recentGuides.error
    }

    return recentGuides.value
  },
})
