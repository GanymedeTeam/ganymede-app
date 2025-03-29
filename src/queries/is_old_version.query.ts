import { isAppOldVersion } from '@/ipc/api.ts'
import { queryOptions } from '@tanstack/react-query'
import { debug, warn } from '@tauri-apps/plugin-log'

export const isAppOldVersionQuery = queryOptions({
  queryKey: ['version', 'is-app-old-version'],
  queryFn: async () => {
    const res = await isAppOldVersion()

    if (res.isErr()) {
      debug(`Error in isAppOldVersionQuery: ${JSON.stringify(res.error, Object.getOwnPropertyNames(res.error), 2)}`)

      // if the error is caused by a JSON parsing error or a GitHub error, we can safely ignore it
      if (res.error.cause === 'Json' || res.error.cause === 'GitHub') {
        warn(`Ignoring error in isAppOldVersionQuery: ${res.error.message}`)

        return false
      }

      throw res.error
    }

    return res.value
  },
})
