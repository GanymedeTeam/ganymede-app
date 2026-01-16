import { queryOptions } from '@tanstack/react-query'
import { getRecentGuides } from '@/ipc/guides.ts'

export function recentGuidesQuery(profileId: string) {
  return queryOptions({
    queryKey: ['recentGuides', profileId],
    queryFn: async () => {
      const recentGuides = await getRecentGuides(profileId)

      if (recentGuides.isErr()) {
        throw recentGuides.error
      }

      return recentGuides.value
    },
  })
}
