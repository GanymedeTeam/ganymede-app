import { useMutation } from '@tanstack/react-query'
import { startUpdate } from '@/ipc/update.ts'

export function useStartUpdate() {
  return useMutation({
    mutationFn: async () => {
      const result = await startUpdate()

      if (result.isErr()) {
        throw result.error
      }

      return result.value
    },
  })
}
