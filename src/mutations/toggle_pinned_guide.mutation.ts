import { useMutation, useQueryClient } from '@tanstack/react-query'

import { PinnedGuides } from '@/ipc/bindings.ts'
import { pinGuide, unpinGuide } from '@/ipc/pinned_guides.ts'
import { pinnedGuidesQuery } from '@/queries/pinned_guides.query.ts'

export const MAX_PINNED_PER_PROFILE = 50

export function useTogglePinnedGuide() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ profileId, guideId, pinned }: { profileId: string; guideId: number; pinned: boolean }) => {
      const result = await (pinned ? pinGuide(profileId, guideId) : unpinGuide(profileId, guideId))

      if (result.isErr()) {
        throw result.error
      }
    },
    onMutate({ profileId, guideId, pinned }) {
      const previous = queryClient.getQueryData(pinnedGuidesQuery.queryKey)
      const base: PinnedGuides = previous ?? { profiles: {} }

      const next: PinnedGuides = { profiles: { ...base.profiles } }
      const profileEntry = {
        guides: [...(next.profiles[profileId]?.guides ?? [])],
      }

      if (pinned) {
        if (!profileEntry.guides.includes(guideId)) {
          profileEntry.guides.push(guideId)
        }
      } else {
        profileEntry.guides = profileEntry.guides.filter((id) => id !== guideId)
      }

      if (profileEntry.guides.length === 0) {
        delete next.profiles[profileId]
      } else {
        next.profiles[profileId] = profileEntry
      }

      queryClient.setQueryData(pinnedGuidesQuery.queryKey, next)

      return previous
    },
    onError(_err, _vars, context) {
      queryClient.setQueryData(pinnedGuidesQuery.queryKey, context)
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries(pinnedGuidesQuery)
    },
  })
}
