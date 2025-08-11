import { QueryClient, useQuery } from '@tanstack/react-query'
import { createRootRouteWithContext, Outlet, useNavigate } from '@tanstack/react-router'
import { onOpenUrl } from '@tauri-apps/plugin-deep-link'
import { info, warn } from '@tauri-apps/plugin-log'
import { useEffect } from 'react'
import { TitleBar } from '@/components/title_bar.tsx'
import { Toaster } from '@/components/ui/sonner.tsx'
import { getProfile } from '@/lib/profile.ts'
import { getProgress } from '@/lib/progress.ts'
import { confQuery } from '@/queries/conf.query.ts'

export const Route = createRootRouteWithContext<{
  queryClient: QueryClient
}>()({
  component: Root,
})

function Root() {
  const conf = useQuery(confQuery)
  const navigate = useNavigate()

  useEffect(() => {
    const unlisten = onOpenUrl(async (urls) => {
      if (!conf.isSuccess) {
        warn('Failed to fetch config for deep-link')

        return
      }

      const url = urls.at(0)

      if (!url) {
        warn('No URL provided to deep-link')

        return
      }

      const profile = getProfile(conf.data)

      const openGuideRegex = /guides\/open\/(\d+)/i

      const openGuideMatches = url.match(openGuideRegex)

      if (openGuideMatches) {
        const [, guideIdString] = openGuideMatches
        const guideId = Number(guideIdString)

        if (Number.isNaN(guideId)) {
          warn(`Invalid guide ID from deep-link: ${openGuideMatches[1]}`)

          return
        }

        const searches = new URLSearchParams(url.split('?').at(1))

        info(`Opening guide ID: ${guideId}`)

        const progress = getProgress(profile, guideId)

        navigate({
          to: '/guides/$id',
          params: {
            id: guideId,
          },
          search: {
            step: searches.get('step') ? Number(searches.get('step')) : (progress?.currentStep ?? 0),
          },
        })
      }
    })

    return () => {
      unlisten.then((cb) => cb())
    }
  }, [conf.isSuccess, conf.data, navigate])

  return (
    <>
      <TitleBar />
      <Toaster />
      <Outlet />
    </>
  )
}
