import { useMutation } from '@tanstack/react-query'
import { startOAuthFlow } from '@/ipc/oauth.ts'

export function useStartOAuthFlow() {
  return useMutation({
    mutationFn: async () => {
      const result = await startOAuthFlow()

      if (result.isErr()) {
        throw result.error
      }
    },
  })
}
