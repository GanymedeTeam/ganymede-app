import { ConfLang } from '@/ipc/bindings.ts'
import { GetConfError } from '@/ipc/conf.ts'
import { useResetConf } from '@/mutations/reset-conf.mutation.ts'
import { confQuery } from '@/queries/conf.query.ts'
import { Trans } from '@lingui/react/macro'
import { useQuery } from '@tanstack/react-query'
import { ErrorComponentProps, useLocation } from '@tanstack/react-router'
import { TriangleAlertIcon } from 'lucide-react'
import { useState } from 'react'
import { PageScrollableContent } from './page-scrollable-content.tsx'
import { SelectLangLabel, SelectLangSelect } from './select-lang.tsx'
import { Alert, AlertDescription, AlertTitle } from './ui/alert.tsx'
import { Button } from './ui/button.tsx'

export function ErrorComponent({ error, info }: ErrorComponentProps) {
  const location = useLocation()
  const isMacOs = navigator.userAgent.toLowerCase().includes('mac os x')
  const conf = useQuery(confQuery)
  const [lang, setLang] = useState<ConfLang>('Fr')
  const resetConf = useResetConf()

  const onClickResetConf = () => {
    resetConf.mutate()
  }

  return (
    <PageScrollableContent className="container flex h-app-without-header flex-col gap-4 px-4 py-2">
      {(conf.isError && conf.error instanceof GetConfError) || location.pathname.includes('/settings') ? (
        <section>
          <SelectLangLabel htmlFor="select-lang" />
          <SelectLangSelect
            id="select-lang"
            value={lang}
            onValueChange={(value) => {
              setLang(value as ConfLang)
            }}
          />
        </section>
      ) : null}
      {conf.isError && conf.error instanceof GetConfError ? (
        <>
          <p>
            <Trans>Une erreur est survenue lors de la récupération de la configuration.</Trans>
          </p>

          <p>
            <Trans>
              Pour réinitialiser la configuration, exécuter le raccourci clavier :{' '}
              <strong className="whitespace-nowrap italic">{isMacOs ? 'Option + Shift + P' : 'Alt + Shift + P'}</strong>
              .
            </Trans>
            <br />
            <Trans>Ou le bouton suivant</Trans>
          </p>

          <Button onClick={onClickResetConf} size="lg">
            <Trans>Réinitialiser</Trans>
          </Button>

          <Alert variant="destructive">
            <TriangleAlertIcon className="size-4" />
            <AlertTitle>
              <Trans>Attention !</Trans>
            </AlertTitle>
            <AlertDescription>
              <Trans>
                Votre progression dans les guides sera réinitialisée. Les guides téléchargés seront toujours présents.
              </Trans>
            </AlertDescription>
          </Alert>

          <Alert variant="destructive">
            <TriangleAlertIcon className="size-4" />
            <AlertTitle>
              <Trans>Détails</Trans>
            </AlertTitle>
            <AlertDescription>
              <pre>{error.message}</pre>
              {error.cause != null && (
                <span>
                  <Trans>Causée par :</Trans>
                  <pre className="whitespace-break-spaces">
                    {typeof error.cause === 'object' &&
                    'message' in error.cause &&
                    typeof error.cause.message === 'string'
                      ? error.cause.message
                      : typeof error.cause === 'string'
                        ? error.cause
                        : error.cause?.toString() || <Trans>Cause non retrouvée.</Trans>}
                  </pre>
                </span>
              )}
              {info?.componentStack && (
                <p>
                  <Trans>Informations supplémentaires : {info.componentStack}</Trans>
                </p>
              )}
            </AlertDescription>
          </Alert>
        </>
      ) : (
        <>
          <Alert variant="destructive">
            <TriangleAlertIcon className="size-4" />
            <AlertTitle>
              <Trans>Une erreur est survenue</Trans>
            </AlertTitle>
            <AlertDescription className="flex flex-col gap-2">
              <pre>{error.message}</pre>
              {error.cause != null && (
                <span>
                  <Trans>Causée par :</Trans>
                  <pre className="whitespace-break-spaces">
                    {typeof error.cause === 'object' &&
                      'message' in error.cause &&
                      typeof error.cause.message === 'string' &&
                      error.cause.message}
                    {typeof error.cause === 'string' && error.cause}
                    {((typeof error.cause === 'object' && !('message' in error.cause)) ||
                      (typeof error.cause !== 'string' && typeof error.cause !== 'object')) &&
                      JSON.stringify(error.cause, Object.getOwnPropertyNames(error.cause), 2)}
                  </pre>
                </span>
              )}
              {info?.componentStack && (
                <p>
                  <Trans>Informations supplémentaires : {info.componentStack}</Trans>
                </p>
              )}
            </AlertDescription>
          </Alert>
        </>
      )}
    </PageScrollableContent>
  )
}
