import { Trans } from '@lingui/react/macro'
import type { QueryClient } from '@tanstack/react-query'
import { createFileRoute, Outlet, redirect } from '@tanstack/react-router'
import { debug, info } from '@tauri-apps/plugin-log'
import { toast } from 'sonner'
import { useTabs } from '@/hooks/use_tabs.ts'
import { getProfile } from '@/lib/profile.ts'
import { getProgress } from '@/lib/progress.ts'
import { confQuery } from '@/queries/conf.query.ts'
import { isAppOldVersionQuery } from '@/queries/is_old_version.query.ts'
import { recentGuidesQuery } from '@/queries/recent_guides.query.ts'

let lastVersionCheckTime = 0
const VERSION_CHECK_INTERVAL_MS = 1000 * 60 * 10 // 10 minutes

let autoOpenGuidesHandled = false

async function checkAppVersion(queryClient: QueryClient) {
  if (Date.now() < lastVersionCheckTime + VERSION_CHECK_INTERVAL_MS) {
    return false
  }

  lastVersionCheckTime = Date.now()
  const isOldVersionResult = await queryClient.ensureQueryData(isAppOldVersionQuery)

  if (isOldVersionResult.isErr()) {
    toast.error(<Trans>Impossible de vérifier la mise à jour de l'application.</Trans>, {
      description: <Trans>Il peut s'agir d'un problème de connexion ou d'une erreur serveur.</Trans>,
      duration: Infinity,
    })
    return false
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

  return true
}

async function handleAutoOpenGuides(queryClient: QueryClient) {
  const conf = await queryClient.ensureQueryData(confQuery)

  if (!conf.autoOpenGuides) {
    return
  }

  const profile = getProfile(conf)
  const recentGuides = await queryClient.ensureQueryData(recentGuidesQuery(profile.id))

  if (recentGuides.length === 0) {
    return
  }

  await debug(`Recent guides: ${recentGuides.join(', ')}`)

  const { setTabs } = useTabs.getState()
  setTabs(recentGuides)

  const firstRecentGuide = recentGuides.at(0)

  if (!firstRecentGuide) {
    await debug('No recent guides found, not redirecting. Should not happen.')
    return
  }

  const progress = getProgress(profile, firstRecentGuide)

  throw redirect({
    to: '/guides/$id',
    params: { id: firstRecentGuide },
    search: { step: progress?.currentStep ?? 0 },
  })
}

export const Route = createFileRoute('/_app')({
  beforeLoad: async ({ context: { queryClient } }) => {
    const shouldProceed = await checkAppVersion(queryClient)

    if (!shouldProceed) {
      return
    }

    if (!autoOpenGuidesHandled) {
      autoOpenGuidesHandled = true
      await handleAutoOpenGuides(queryClient)
    }
  },
  component: () => <Outlet />,
})
