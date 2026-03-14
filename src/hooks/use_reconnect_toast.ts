import { useLingui } from '@lingui/react/macro'
import { useNavigate } from '@tanstack/react-router'
import { useCallback } from 'react'
import { toast } from 'sonner'
import { useStartOAuthFlow } from '@/mutations/start_oauth_flow.mutation.ts'

export function useReconnectToast() {
  const { t } = useLingui()
  const navigate = useNavigate()
  const startOAuthFlow = useStartOAuthFlow()

  return useCallback(
    (opts?: Parameters<typeof toast.error>[1]) => {
      toast.error(t`Votre session a expiré, veuillez vous reconnecter.`, {
        ...opts,
        action: {
          label: t`Se reconnecter`,
          onClick: async () => {
            await navigate({ to: '/oauth/waiting' })
            await startOAuthFlow.mutateAsync()
          },
        },
      })
    },
    [t, navigate, startOAuthFlow.mutateAsync],
  )
}
