import { queryOptions } from '@tanstack/react-query'
import { hasGuidesNotUpdated } from '@/ipc/guides.ts'

export const hasGuidesNotUpdatedQuery = queryOptions({
  queryKey: ['guides', 'has_guides_not_updated'],
  queryFn: async () => {
    const result = await hasGuidesNotUpdated()

    if (result.isErr()) {
      throw result.error
    }

    return result.value
  },
})
