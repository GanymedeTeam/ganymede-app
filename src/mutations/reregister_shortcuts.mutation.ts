import { useMutation } from '@tanstack/react-query'
import { reregisterShortcuts } from '@/ipc/shortcuts.ts'

export function useReregisterShortcuts() {
  return useMutation({
    mutationFn: async () => {
      const result = await reregisterShortcuts()

      if (result.isErr()) {
        throw result.error
      }
    },
  })
}
