import { useMutation } from '@tanstack/react-query'
import { openImageViewer } from '@/ipc/image_viewer.ts'

export function useOpenImageViewer() {
  return useMutation({
    mutationFn: async ({ imageUrl, title }: { imageUrl: string; title?: string }) => {
      const result = await openImageViewer(imageUrl, title)

      if (result.isErr()) {
        throw result.error
      }

      return result.value
    },
  })
}
