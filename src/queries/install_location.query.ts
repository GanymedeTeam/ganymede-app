import { queryOptions } from '@tanstack/react-query'

import { getInstallLocation } from '@/ipc/base.ts'

export const installLocationQuery = queryOptions({
  queryKey: ['base', 'install-location'],
  staleTime: Infinity,
  queryFn: async () => {
    const res = await getInstallLocation()

    // Fail open: never warn if the check itself failed.
    return res.unwrapOr('NotConcerned' as const)
  },
})
