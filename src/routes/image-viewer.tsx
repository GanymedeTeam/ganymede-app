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
      <DownloadImage
        alt={title ?? 'Image'}
        className="max-h-[95vh] max-w-[95vw] rounded-lg object-contain shadow-2xl"
        src={image}
      />
      {title && (
        <div className="-translate-x-1/2 absolute bottom-8 left-1/2 rounded-lg bg-black/70 px-4 py-2 text-sm text-white backdrop-blur-sm">
          {title}
        </div>
      )}
    </div>
  )
}
