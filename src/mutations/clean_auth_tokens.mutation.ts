import { useMutation, useQueryClient } from '@tanstack/react-query'
import { cleanAuthTokens } from '@/ipc/oauth.ts'
import { getAuthTokensQuery } from '@/queries/get_auth_tokens.query.ts'

export function useCleanAuthTokens() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async () => {
      const result = await cleanAuthTokens()

      if (result.isErr()) {
        throw result.error
      }

      queryClient.invalidateQueries(getAuthTokensQuery)
    },
  })
}
