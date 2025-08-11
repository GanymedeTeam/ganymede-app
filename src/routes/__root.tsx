import { QueryClient } from '@tanstack/react-query'
import { createRootRouteWithContext, Outlet } from '@tanstack/react-router'
import { DeepLinkGuideDownloadDialog } from '@/components/deep_link_guide_download_dialog.tsx'
import { TitleBar } from '@/components/title_bar.tsx'
import { Toaster } from '@/components/ui/sonner.tsx'

export const Route = createRootRouteWithContext<{
  queryClient: QueryClient
}>()({
  component: Root,
})

function Root() {
  return (
    <>
      <TitleBar />
      <Toaster />
      <Outlet />
      <DeepLinkGuideDownloadDialog />
    </>
  )
}
