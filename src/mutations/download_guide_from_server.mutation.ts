import { useMutation, useQueryClient } from '@tanstack/react-query'

import { Guide } from '@/ipc/bindings.ts'
import { downloadGuideFromServer } from '@/ipc/guides.ts'
import { guidesQuery } from '@/queries/guides.query.ts'
import { summaryQuery } from '@/queries/summary.query.ts'

const DOWNLOAD_GUIDE_TIMEOUT_MS = 30_000

export class DownloadGuideTimeoutError extends Error {
  constructor(guideId: number) {
    super(`Download of guide ${guideId} timed out after ${DOWNLOAD_GUIDE_TIMEOUT_MS}ms`)
  }
}

function withTimeout<T>(promise: PromiseLike<T>, onTimeout: () => Error): Promise<T> {
  let timeoutId: ReturnType<typeof setTimeout> | undefined

  const timeout = new Promise<never>((_, reject) => {
    timeoutId = setTimeout(() => reject(onTimeout()), DOWNLOAD_GUIDE_TIMEOUT_MS)
  })

  return Promise.race([promise, timeout]).finally(() => clearTimeout(timeoutId))
}

export function useDownloadGuideFromServer() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ guide, folder }: { guide: Pick<Guide, 'id'>; folder: string }) => {
      const result = await withTimeout(
        downloadGuideFromServer(guide.id, folder),
        () => new DownloadGuideTimeoutError(guide.id),
      )

      if (result.isErr()) {
        throw result.error
      }

      await Promise.allSettled([
        queryClient.invalidateQueries(guidesQuery()),
        queryClient.invalidateQueries(summaryQuery(guide.id)),
      ])
    },
  })
}
