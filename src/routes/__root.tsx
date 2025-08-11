import { QueryClient } from '@tanstack/react-query'
import { createRootRouteWithContext, Outlet, useNavigate } from '@tanstack/react-router'
import { info } from '@tauri-apps/plugin-log'
import { useEffect } from 'react'
import { TitleBar } from '@/components/title_bar.tsx'
import { Toaster } from '@/components/ui/sonner.tsx'
import { onOpenGuideRequest } from '@/ipc/deep_link.ts'

export const Route = createRootRouteWithContext<{
  queryClient: QueryClient
}>()({
  component: Root,
})

function Root() {
  const navigate = useNavigate()

  useEffect(() => {
    const unlisten = onOpenGuideRequest((guide_id, step) => {
      info(`Opening guide ID: ${guide_id} at step: ${step}`)

      navigate({
        to: '/guides/$id',
        params: {
          id: guide_id,
        },
        search: {
          step,
        },
      })
    })

    return () => {
      unlisten.then((cb => cb()))
    }
  }, [navigate])

  return (
    <>
      <TitleBar />
      <Toaster />
      <Outlet />
    </>
  )
}
