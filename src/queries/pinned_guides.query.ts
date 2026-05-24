import { queryOptions } from '@tanstack/react-query'
import { PinnedGuides } from '@/ipc/bindings.ts'
import { GetPinnedGuidesError, getPinnedGuides } from '@/ipc/pinned_guides.ts'

export const pinnedGuidesQuery = queryOptions<PinnedGuides, GetPinnedGuidesError>({
  queryKey: ['pinned_guides'],
  queryFn: async () => {
    const pinned = await getPinnedGuides()

    if (pinned.isErr()) {
      throw pinned.error
    }

    return pinned.value
  },
})
