import { useQueryClient } from '@tanstack/react-query'
import { useEffect } from 'react'

import { onGuidesUpdatedAtLaunch } from '@/ipc/guides.ts'
import { corruptedGuidesQuery } from '@/queries/corrupted_guides.query.ts'

/**
 * Guides are updated in the background while the frontend boots, so the queries read
 * before it completes are stale. The update also downloads again the guides that were
 * quarantined after a local corruption, which the toast has to stop reporting.
 * See issue #223.
 */
export function useGuidesUpdatedAtLaunchHandler() {
  const queryClient = useQueryClient()

  useEffect(() => {
    const unlisten = onGuidesUpdatedAtLaunch().on(() => {
      queryClient.invalidateQueries({ queryKey: ['conf', 'guides'] })
      queryClient.invalidateQueries({ queryKey: ['conf', 'guides_in_folder'] })
      queryClient.invalidateQueries(corruptedGuidesQuery())
    })

    return () => {
      unlisten.then((cb) => cb())
    }
  }, [queryClient])
}
