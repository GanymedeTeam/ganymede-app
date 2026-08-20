import { Trans } from '@lingui/react/macro'
import type { QueryClient } from '@tanstack/react-query'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { createFileRoute, Outlet, redirect, useRouter } from '@tanstack/react-router'
import { debug } from '@tauri-apps/plugin-log'
import { useEffect } from 'react'
import { toast } from 'sonner'

import { useAppVersionCheck } from '@/hooks/use_app_version_check.ts'
import { useReconnectToast } from '@/hooks/use_reconnect_toast.ts'
import { useTabs } from '@/hooks/use_tabs.ts'
import { syncProfiles } from '@/ipc/sync.ts'
import { getProfile } from '@/lib/profile.ts'
import { getProgress } from '@/lib/progress.ts'
import { confQuery } from '@/queries/conf.query.ts'
import { installLocationQuery } from '@/queries/install_location.query.ts'
import { recentGuidesQuery } from '@/queries/recent_guides.query.ts'

type AutoOpenedGuide = {
  id: number
  step: number
}

type AppRouter = ReturnType<typeof useRouter>

let autoOpenGuidesHandled = false
let initialSyncHandled = false
// Guide opened at launch, kept until the background sync can realign its step on remote progress.
let autoOpenedGuide: AutoOpenedGuide | null = null

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
  setTabs([...recentGuides].reverse())

  const firstRecentGuide = recentGuides.at(0)

  if (!firstRecentGuide) {
    await debug('No recent guides found, not redirecting. Should not happen.')
    return
  }

  const step = getProgress(profile, firstRecentGuide)?.currentStep ?? 0

  autoOpenedGuide = { id: firstRecentGuide, step }

  throw redirect({
    to: '/guides/$id',
    params: { id: firstRecentGuide },
    search: { step },
  })
}

/**
 * The guide is opened from the local progress to avoid waiting for the sync, so its step can be
 * behind what the server knows. Realign it once the sync landed, unless the user moved since then.
 */
async function realignAutoOpenedGuideStep(queryClient: QueryClient, router: AppRouter) {
  const openedGuide = autoOpenedGuide

  if (!openedGuide) {
    return
  }

  autoOpenedGuide = null

  const openedGuideLocation = router.buildLocation({
    to: '/guides/$id',
    params: { id: openedGuide.id },
    search: { step: openedGuide.step },
  })

  // The user navigated away or moved to another step in the meantime: leave them there.
  if (router.state.location.href !== openedGuideLocation.href) {
    return
  }

  const conf = await queryClient.ensureQueryData(confQuery)
  const syncedStep = getProgress(getProfile(conf), openedGuide.id)?.currentStep ?? 0

  if (syncedStep === openedGuide.step) {
    return
  }

  await debug(`[Sync] realigning guide ${openedGuide.id} on step ${syncedStep}`)

  await router.navigate({
    to: '/guides/$id',
    params: { id: openedGuide.id },
    search: { step: syncedStep },
    replace: true,
  })
}

function notifySyncError(cause: unknown, showReconnectToast: ReturnType<typeof useReconnectToast>) {
  if (cause === 'TokensNotFound' || cause === 'NotConnected') {
    return
  }

  if (typeof cause === 'object' && cause !== null && 'ValidationError' in cause) {
    toast.error(<Trans>La synchronisation a échoué : données invalides.</Trans>, {
      description: <Trans>Certaines données locales sont invalides et bloquent la synchronisation.</Trans>,
      duration: Infinity,
    })

    return
  }

  if (cause === 'TokenExpired') {
    showReconnectToast({ duration: Infinity })

    return
  }

  toast.error(<Trans>La synchronisation a échoué.</Trans>, { duration: 4000 })
}

/**
 * The sync hits the server, so it runs in the background: the app renders right away and the
 * outcome is only reported once the request settled. See issue #231.
 */
function useInitialSync() {
  const queryClient = useQueryClient()
  const router = useRouter()
  const showReconnectToast = useReconnectToast()

  useEffect(() => {
    if (initialSyncHandled) {
      return
    }

    initialSyncHandled = true

    const runInitialSync = async () => {
      const syncResult = await syncProfiles()

      if (syncResult.isErr()) {
        await debug(`[Sync] initial sync failed: ${syncResult.error}`)
        notifySyncError(syncResult.error.cause, showReconnectToast)

        return
      }

      await debug('[Sync] initial sync completed, invalidating conf cache')
      await queryClient.invalidateQueries(confQuery)
      await realignAutoOpenedGuideStep(queryClient, router)
    }

    runInitialSync().catch((err) => {
      debug(`[Sync] initial sync unexpected error: ${err}`)
    })
  }, [queryClient, router, showReconnectToast])
}

function AppLayout() {
  const installLocation = useQuery(installLocationQuery)

  useAppVersionCheck()
  useInitialSync()

  // On macOS, an app run from outside the Applications folder (e.g. Downloads, or a
  // read-only App Translocation path) can't apply auto-updates in place.
  useEffect(() => {
    if (installLocation.data === 'NotInApplications' || installLocation.data === 'Translocated') {
      toast.warning(
        <Trans>
          Ganymède n'est pas installé dans le dossier Applications, ce qui peut empêcher les mises à jour automatiques.
        </Trans>,
        {
          id: 'install-location',
          description: <Trans>Déplacez l'application dans le dossier Applications, puis relancez-la.</Trans>,
          duration: Infinity,
        },
      )
    }
  }, [installLocation.data])

  return <Outlet />
}

export const Route = createFileRoute('/_app')({
  // Only local data is awaited here: waiting for the server would leave the app on a blank page.
  beforeLoad: async ({ context: { queryClient } }) => {
    if (autoOpenGuidesHandled) {
      return
    }

    autoOpenGuidesHandled = true

    await handleAutoOpenGuides(queryClient)
  },
  component: AppLayout,
})
