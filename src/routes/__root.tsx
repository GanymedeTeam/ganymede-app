import { TitleBar } from '@/components/title-bar.tsx'
import { Toaster } from '@/components/ui/sonner.tsx'
import { QueryClient } from '@tanstack/react-query'
import { Outlet, createRootRouteWithContext } from '@tanstack/react-router'

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
    </>
  )
}
