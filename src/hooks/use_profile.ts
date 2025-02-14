import { getProfile } from '@/lib/profile.ts'
import { confQuery } from '@/queries/conf.query.ts'
import { useSuspenseQuery } from '@tanstack/react-query'

export function useProfile() {
  const conf = useSuspenseQuery(confQuery)

  return getProfile(conf.data)
}
