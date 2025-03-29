import { useProfile } from '@/hooks/use_profile.ts'
import { getProgress, newProgress } from '@/lib/progress.ts'
import { queryOptions } from '@tanstack/react-query'

export function progressQuery(guideId: number) {
  const profile = useProfile()

  return queryOptions({
    queryKey: ['conf', 'profile', profile.id, 'progress', guideId],
    queryFn: async () => {
      return getProgress(profile, guideId) ?? newProgress(guideId)
    },
  })
}
