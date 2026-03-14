import { useQueryClient } from '@tanstack/react-query'
import { useEffect } from 'react'
import { cleanAuthTokens, onJwtExpired } from '@/ipc/oauth.ts'
import { getAuthTokensQuery } from '@/queries/get_auth_tokens.query.ts'
import { useReconnectToast } from '@/hooks/use_reconnect_toast.ts'

export function useJwtExpiredHandler() {
  const queryClient = useQueryClient()
  const showReconnectToast = useReconnectToast()

  useEffect(() => {
    const unlisten = onJwtExpired(async () => {
      await cleanAuthTokens()
      queryClient.invalidateQueries(getAuthTokensQuery)
      showReconnectToast()
    })

    return () => {
      unlisten.then((cb) => cb())
    }
  }, [queryClient, showReconnectToast])
}
