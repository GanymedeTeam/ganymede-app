import { Trans } from '@lingui/react/macro'
import { useQuery } from '@tanstack/react-query'
import { ErrorComponentProps, useLocation } from '@tanstack/react-router'
import { FileCogIcon, TriangleAlertIcon } from 'lucide-react'
import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card.tsx'
import { ConfLang } from '@/ipc/bindings.ts'
import { GetConfError } from '@/ipc/conf.ts'
import { formatErrorCause } from '@/lib/error_formatter.tsx'
import { useResetConf } from '@/mutations/reset_conf.mutation.ts'
import { confQuery } from '@/queries/conf.query.ts'
import { Page } from '@/routes/-page.tsx'
import { PageScrollableContent } from './page_scrollable_content.tsx'
import { SelectLangLabel, SelectLangSelect } from './select_lang.tsx'
import { Alert, AlertDescription, AlertTitle } from './ui/alert.tsx'
import { Button } from './ui/button.tsx'

interface ErrorDisplayProps {
  error: Error
  info?: { componentStack?: string }
}

export function ErrorDisplay({ error, info }: ErrorDisplayProps) {
  return (
    <Alert variant="destructive">
      <TriangleAlertIcon className="size-4" />
      <AlertTitle className="text-base">{error.message}</AlertTitle>
      <AlertDescription className="flex flex-col gap-2">
        {error.cause != null && (
          <span>
            <Trans>Causée par</Trans>
            <pre className="whitespace-break-spaces">{formatErrorCause(error.cause)}</pre>
          </span>
        )}
        {info?.componentStack && (
          <p>
            <Trans>Informations supplémentaires : {info.componentStack}</Trans>
          </p>
        )}
      </AlertDescription>
    </Alert>
  )
}

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
    <Page title={`Erreur`} className="slot-[page-title]:top-0">
      <PageScrollableContent className="flex h-app-without-header flex-col gap-4 px-4 py-2">
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
        <Card>
          <CardHeader className="xs:pb-3">
            <CardTitle className="text-lg xs:text-lg">
              {conf.isError && conf.error instanceof GetConfError ? (
                <Trans>Une erreur est survenue lors de la récupération de la configuration</Trans>
              ) : (
                <Trans>Une erreur est survenue</Trans>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-4 xs:pt-3">
            {conf.isError && conf.error instanceof GetConfError ? (
              <>
                <p>
                  <Trans>
                    Pour réinitialiser la configuration, exécuter le raccourci clavier :{' '}
                    <strong className="whitespace-nowrap italic">
                      {isMacOs ? 'Option + Shift + P' : 'Alt + Shift + P'}
                    </strong>
                  </Trans>
                  <br />
                  <Trans>ou le bouton suivant</Trans>
                </p>

                <Button onClick={onClickResetConf} size="lg" variant="destructive">
                  <FileCogIcon />
                  <Trans>Réinitialiser</Trans>
                </Button>

                <Alert variant="destructive">
                  <TriangleAlertIcon className="size-4" />
                  <AlertTitle>
                    <Trans>Attention !</Trans>
                  </AlertTitle>
                  <AlertDescription>
                    <Trans>
                      Votre progression dans les guides sera réinitialisée. Les guides téléchargés seront toujours
                      présents.
                    </Trans>
                  </AlertDescription>
                </Alert>

                <ErrorDisplay error={error} info={info} />
              </>
            ) : (
              <>
                <ErrorDisplay error={error} info={info} />
              </>
            )}
          </CardContent>
        </Card>
      </PageScrollableContent>
    </Page>
  )
}
