import { Trans } from '@lingui/react/macro'
import { createFileRoute, Outlet, redirect } from '@tanstack/react-router'
import { debug, info } from '@tauri-apps/plugin-log'
import { toast } from 'sonner'

import { isAppOldVersionQuery } from '@/queries/is_old_version.query.ts'

let lastCheckTime = 0
const recheckInterval = 1000 * 60 * 10 // 10 minutes

export const Route = createFileRoute('/_app')({
  beforeLoad: async ({ context: { queryClient } }) => {
    if (Date.now() < lastCheckTime + recheckInterval) {
      // If the query is already in the cache, we can skip the check
      return
    }

    lastCheckTime = Date.now()
    const isOldVersionResult = await queryClient.ensureQueryData(isAppOldVersionQuery)

    if (isOldVersionResult.isErr()) {
      // toast and return
      toast.error(<Trans>Impossible de vérifier la mise à jour de l'application.</Trans>, {
        description: <Trans>Il peut s'agir d'un problème de connexion ou d'une erreur serveur.</Trans>,
        duration: Infinity,
      })

      return
    }

    const isOldVersion = isOldVersionResult.value

    if (isOldVersion.isOld) {
      await info('App is old version')
      await debug(JSON.stringify(isOldVersion, undefined, 2))

      throw redirect({
        to: '/app-old-version',
        search: {
          fromVersion: isOldVersion.from,
          toVersion: isOldVersion.to,
        },
      })
    }
  },
  component: () => <Outlet />,
})
