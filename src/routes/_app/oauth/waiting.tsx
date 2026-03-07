import { Trans, useLingui } from '@lingui/react/macro'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { info } from '@tauri-apps/plugin-log'
import { useEffect } from 'react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button.tsx'
import { taurpc } from '@/ipc/ipc.ts'
import { syncProfiles } from '@/ipc/sync.ts'
import { confQuery } from '@/queries/conf.query.ts'
import { getAuthTokensQuery } from '@/queries/get_auth_tokens.query.ts'
import { getMeQuery } from '@/queries/get_me.query.ts'
import { Page } from '@/routes/-page.tsx'

export const Route = createFileRoute('/_app/oauth/waiting')({
  component: Waiting,
})

function Waiting() {
  const queryClient = useQueryClient()
  const { t } = useLingui()
  const navigate = useNavigate()
  const getMe = useQuery({
    ...getMeQuery,
    enabled: false,
  })

  const onClickRestart = () => {
    taurpc.oauth.startOAuthFlow()
  }

  useEffect(() => {
    const unlisten = taurpc.oauth.onOAuthFlowEnd.on(async () => {
      const user = await getMe.refetch()

      if (user.isError) {
        toast.error(
          t`Une erreur est survenue lors de la récupération de vos informations utilisateur : ${user.error.message}`,
        )
        return
      }

      info('OAuth flow ended, fetched user: ' + JSON.stringify(user.data, undefined, 2))

      navigate({
        to: '/',
      }).then(async () => {
        toast.success(<Trans>Vous êtes maintenant connecté en tant que "{user.data?.name ?? 'non trouvé'}".</Trans>)

        queryClient.invalidateQueries(getAuthTokensQuery)

        const syncResult = await syncProfiles()

        if (syncResult.isOk()) {
          queryClient.invalidateQueries(confQuery)
          toast.success(<Trans>Synchronisation des profils terminée.</Trans>)
        } else {
          const err = syncResult.error.cause
          const isValidationError = typeof err === 'object' && err !== null && 'ValidationError' in err
          if (isValidationError) {
            toast.error(<Trans>La synchronisation a échoué : données invalides.</Trans>)
          } else {
            toast.error(<Trans>La synchronisation a échoué.</Trans>, { duration: 4000 })
          }
        }
      })
    })

    return () => {
      unlisten.then((cb) => cb())
    }
  }, [navigate, getMe, queryClient.invalidateQueries, t])

  return (
    <Page title={t`Se connecter`}>
      <div className="flex grow flex-col items-center justify-center gap-4 px-4 text-center">
        <p>
          <Trans>Vous allez être redirigé vers la page de connexion de Ganymède.</Trans>
        </p>

        <Button onClick={onClickRestart} size="lg">
          Recommencer
        </Button>
      </div>
    </Page>
  )
}
