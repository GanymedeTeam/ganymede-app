import { createFileRoute } from '@tanstack/react-router'
import { getCurrentWindow } from '@tauri-apps/api/window'
import { useCallback, useEffect } from 'react'
import { z } from 'zod'
import { DownloadImage } from '@/components/download_image.tsx'
import { closeImageViewer } from '@/ipc/image_viewer.ts'

const SearchZod = z.object({
  image: z.string(),
  title: z.string().optional(),
})

export const Route = createFileRoute('/image-viewer')({
  validateSearch: SearchZod.parse,
  component: ImageViewerPage,
})

function ImageViewerPage() {
  const { image, title } = Route.useSearch()

  const handleClose = useCallback(async () => {
    const currentWindow = getCurrentWindow()
    const result = await closeImageViewer(currentWindow.label)

    if (result.isErr()) {
      console.error('Failed to close image viewer:', result.error)
    }
  }, [])

  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        handleClose()
      }
    }

    window.addEventListener('keydown', handleEscape)
    return () => window.removeEventListener('keydown', handleEscape)
  }, [handleClose])

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm"
      onClick={handleClose}
    >
      <div className="relative max-h-[90vh] max-w-[90vw]" onClick={(e) => e.stopPropagation()}>
        <button
          type="button"
          onClick={handleClose}
          className="absolute -right-4 -top-4 z-10 flex size-8 items-center justify-center rounded-full bg-red-500 text-white hover:bg-red-600 transition-colors"
          aria-label="Close"
        >
          ✕
        </button>

        <DownloadImage url={image} alt={title ?? 'Image'} className="max-h-[90vh] max-w-[90vw] object-contain" />

        {title && (
          <div className="absolute bottom-0 left-0 right-0 bg-black/60 px-4 py-2 text-center text-white">
            {title}
          </div>
        )}
      </div>
    </div>
  )
}
