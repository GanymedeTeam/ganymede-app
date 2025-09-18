import { queryOptions } from '@tanstack/react-query'
import { AuthTokens } from '@/ipc/bindings.ts'
import { GetAuthTokensError, getAuthTokens } from '@/ipc/oauth.ts'

export const getAuthTokensQuery = queryOptions<AuthTokens | null, GetAuthTokensError>({
  queryKey: ['auth', 'tokens'],
  queryFn: async () => {
    const tokens = await getAuthTokens()

    if (tokens.isErr()) {
      throw tokens.error
    }

    return tokens.value
  },
})
