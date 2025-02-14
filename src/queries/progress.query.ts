import { getProfile } from '@/lib/profile.ts'
import { getProgress, newProgress } from '@/lib/progress.ts'
import { queryOptions, useSuspenseQuery } from '@tanstack/react-query'
import { confQuery } from './conf.query.ts'

export function progressQuery(guideId: number) {
  const conf = useSuspenseQuery(confQuery)

  return queryOptions({
    queryKey: ['conf', 'progress', guideId],
    queryFn: async () => {
      const profile = getProfile(conf.data)

      return getProgress(profile, guideId) ?? newProgress(guideId)
    },
  })
}
