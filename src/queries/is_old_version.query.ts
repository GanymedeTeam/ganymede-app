import { isAppOldVersion } from '@/ipc/is_app_old_version.ts'
import { queryOptions } from '@tanstack/react-query'

export const isAppOldVersionQuery = queryOptions({
  queryKey: ['version', 'is-app-old-version'],
  queryFn: async () => {
    const res = await isAppOldVersion()

    if (res.isErr()) {
      // if the error is caused by a JSON parsing error or a GitHub error, we can safely ignore it
      if (res.error.cause === 'Json' || res.error.cause === 'GitHub') {
        return false
      }

      throw res.error
    }

    return res.value
  },
})
