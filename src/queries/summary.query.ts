import { queryOptions } from '@tanstack/react-query'
import { getGuideSummary } from '@/ipc/guides.ts'

export function summaryQuery(guideId: number) {
  return queryOptions({
    queryKey: ['guides', 'summary', guideId],
    queryFn: async () => {
      const summary = await getGuideSummary(guideId)

      if (summary.isErr()) {
        throw summary.error
      }

      return summary.value
    },
    staleTime: Infinity,
  })
}
