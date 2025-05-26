import { queryOptions } from '@tanstack/react-query'
import { debug, warn } from '@tauri-apps/plugin-log'
import { err, ok } from 'neverthrow'

import { GetIsAppOldVersionError, isAppOldVersion } from '@/ipc/api.ts'
import { errorToObject } from '@/lib/error.ts'

export const isAppOldVersionQuery = queryOptions({
  queryKey: ['version', 'is-app-old-version'],
  queryFn: async () => {
    const res = await isAppOldVersion()

    if (res.isErr()) {
      await debug(`Error in isAppOldVersionQuery: ${JSON.stringify(errorToObject(res.error), undefined, 2)}`)

      // if the error is caused by a JSON parsing error or a GitHub error, we can safely ignore it
      if (
        res.error instanceof GetIsAppOldVersionError &&
        (res.error.isJsonMalformedError() || res.error.isGitHubError())
      ) {
        await warn(`Ignoring error in isAppOldVersionQuery: ${res.error.message}`)

        return err(res.error.cause)
      }

      return err({ Unknown: res.error.message })
    }

    return ok(res.value)
  },
})
