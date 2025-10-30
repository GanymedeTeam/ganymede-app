import { createFileRoute } from '@tanstack/react-router'
import { z } from 'zod'
import { DownloadImage } from '@/components/download_image.tsx'
import { Toaster } from '@/components/ui/sonner.tsx'

const SearchZod = z.object({
  image: z.string(),
  title: z.string().optional(),
})

export const Route = createFileRoute('/image-viewer')({
  validateSearch: SearchZod.parse,
  component: ImageViewerLayout,
})

function ImageViewerLayout() {
  return (
    <>
      <Toaster />
      <ImageViewerPage />
    </>
  )
}

function ImageViewerPage() {
  const { image, title } = Route.useSearch()

  return (
    <div className="flex h-[calc(100vh-var(--spacing-titlebar))] w-screen items-center justify-center bg-black/80 backdrop-blur-sm">
      <DownloadImage src={image} alt={title ?? 'Image'} className="h-full w-full object-contain" />
    </div>
  )
}
