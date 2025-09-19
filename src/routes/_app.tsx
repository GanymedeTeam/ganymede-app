import { Trans } from '@lingui/react/macro'
import { createFileRoute, Outlet, redirect } from '@tanstack/react-router'
import { debug, info } from '@tauri-apps/plugin-log'
import { toast } from 'sonner'
import { useTabs } from '@/hooks/use_tabs.ts'
import { getProfile } from '@/lib/profile.ts'
import { getProgress } from '@/lib/progress.ts'
import { confQuery } from '@/queries/conf.query.ts'
import { isAppOldVersionQuery } from '@/queries/is_old_version.query.ts'
import { recentGuidesQuery } from '@/queries/recent_guides.query.ts'

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

    const conf = await queryClient.ensureQueryData(confQuery)

    if (conf.autoOpenGuides) {
      const recentGuides = await queryClient.ensureQueryData(recentGuidesQuery)

      if (recentGuides.length > 0) {
        await debug(`Recent guides: ${recentGuides.join(', ')}`)

        const { setTabs } = useTabs.getState()

        setTabs(recentGuides)

        const firstRecentGuide = recentGuides.at(0)

        if (!firstRecentGuide) {
          await debug('No recent guides found, not redirecting. Should not happen.')

          return
        }

        const profile = getProfile(conf)
        const progress = getProgress(profile, firstRecentGuide)

        throw redirect({
          to: '/guides/$id',
          params: { id: firstRecentGuide },
          search: { step: progress?.currentStep ?? 0 },
        })
      }
    }
  },
  component: () => <Outlet />,
})
