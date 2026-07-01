import { queryOptions } from '@tanstack/react-query'

import { getCorruptedGuides } from '@/ipc/guides.ts'

export function corruptedGuidesQuery() {
  return queryOptions({
    queryKey: ['guides', 'corrupted'],
    queryFn: async () => {
      const corrupted = await getCorruptedGuides()

      if (corrupted.isErr()) {
        throw corrupted.error
      }

      return corrupted.value
    },
    staleTime: Number.POSITIVE_INFINITY,
  })
}
