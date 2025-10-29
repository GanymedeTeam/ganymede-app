import { QueryClient } from '@tanstack/react-query'
import { createRootRouteWithContext, Outlet } from '@tanstack/react-router'
import { error } from '@tauri-apps/plugin-log'
import { useEffect, useMemo } from 'react'
import { DeepLinkGuideDownloadDialog } from '@/components/deep_link_guide_download_dialog.tsx'
import { NotificationAlertDialog } from '@/components/notification_alert_dialog.tsx'
import { TitleBar } from '@/components/title_bar.tsx'
import { Toaster } from '@/components/ui/sonner.tsx'
import { taurpc } from '@/ipc/ipc.ts'

export const Route = createRootRouteWithContext<{
  queryClient: QueryClient
}>()({
  component: Root,
})

function Root() {
  const isImageViewer = useMemo(() => {
    return new URLSearchParams(window.location.search).has('image')
  }, [])

  useEffect(() => {
    if (!isImageViewer) {
      taurpc.base.startup().catch((err) => {
        error(`Error sending startup message: ${err}`)
      })
    }
  }, [isImageViewer])

  if (isImageViewer) {
    return (
      <>
        <Toaster />
        <Outlet />
      </>
    )
  }

  return (
    <>
      <TitleBar />
      <Toaster />
      <Outlet />
      <DeepLinkGuideDownloadDialog />
      <NotificationAlertDialog />
    </>
  )
}
