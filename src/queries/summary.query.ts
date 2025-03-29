import { getGuideSummary } from '@/ipc/guides.ts'
import { queryOptions } from '@tanstack/react-query'

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
