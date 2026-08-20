import { useQuery } from '@tanstack/react-query'
import { useNavigate } from '@tanstack/react-router'
import { debug, info } from '@tauri-apps/plugin-log'
import { useEffect } from 'react'

import { isAppOldVersionQuery } from '@/queries/is_old_version.query.ts'

/**
 * The version check hits the server, so it runs in the background: the app renders right
 * away and only moves to the update page once an outdated version is confirmed.
 * See issue #231.
 */
export function useAppVersionCheck() {
  const navigate = useNavigate()
  const { data: isAppOldVersion } = useQuery(isAppOldVersionQuery)

  useEffect(() => {
    if (isAppOldVersion === undefined || isAppOldVersion.isErr()) {
      return
    }

    const isOld = isAppOldVersion.value

    if (!isOld.isOld) {
      return
    }

    info('App is old version')
    debug(JSON.stringify(isOld, undefined, 2))

    navigate({
      to: '/app-old-version',
      search: {
        fromVersion: isOld.from,
        toVersion: isOld.to,
      },
      replace: true,
    })
  }, [isAppOldVersion, navigate])
}
