import { useMutation } from '@tanstack/react-query'
import { openGuidesFolder } from '@/ipc/guides.ts'

export function useOpenGuidesFolder() {
  return useMutation({
    mutationFn: async () => {
      const result = await openGuidesFolder()

      if (result.isErr()) {
        throw result.error
      }
    },
  })
}
