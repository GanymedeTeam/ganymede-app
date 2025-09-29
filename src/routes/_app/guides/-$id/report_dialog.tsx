import { Trans, useLingui } from '@lingui/react/macro'
import { BugIcon, LoaderCircleIcon, SendIcon } from 'lucide-react'
import { FormEvent, Fragment, useState } from 'react'
import { ErrorDisplay } from '@/components/error_component.tsx'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert_dialog.tsx'
import { Button } from '@/components/ui/button.tsx'
import { Input } from '@/components/ui/input.tsx'
import { Label } from '@/components/ui/label.tsx'
import { ScrollArea } from '@/components/ui/scroll_area.tsx'
import { Textarea } from '@/components/ui/textarea.tsx'
import { useSendReport } from '@/mutations/send_report.mutation.ts'

export function ReportDialog({ guideId, stepIndex }: { guideId: number; stepIndex: number }) {
  const { t } = useLingui()
  const [username, setUsername] = useState('')
  const [content, setContent] = useState('')
  const sendReport = useSendReport()

  const handleSubmit = async (evt: FormEvent) => {
    evt.preventDefault()

    await sendReport.mutateAsync({
      guide_id: guideId,
      step: stepIndex + 1,
      content,
      username: username === '' ? null : username,
    })
  }

  return (
    <>
      <AlertDialog
        onOpenChange={(open) => {
          if (!open) {
            setTimeout(() => {
              sendReport.reset()
              setUsername('')
              setContent('')
            }, 200)
          }
        }}
      >
        <AlertDialogTrigger asChild>
          <Button variant="ghost" size="icon" className="size-6 sm:size-8">
            <BugIcon />
          </Button>
        </AlertDialogTrigger>
        <AlertDialogContent className="max-h-[calc(var(--spacing-app-without-header)-var(--spacing-titlebar)-1rem)] overflow-auto p-3 sm:p-6">
          <AlertDialogTitle>
            <Trans>Envoyer un rapport</Trans>
          </AlertDialogTitle>
          <form id="report-form" onSubmit={handleSubmit} className="flex flex-col gap-2">
            {!sendReport.isSuccess && (
              <>
                <div>
                  <Label htmlFor="username" className="mb-1 block">
                    <Trans>Votre pseudo</Trans>
                  </Label>
                  <Input
                    id="username"
                    disabled={sendReport.isPending}
                    placeholder={t`Votre pseudo`}
                    name="username"
                    className="placeholder:italic"
                    value={username}
                    onChange={(evt) => setUsername(evt.currentTarget.value)}
                    maxLength={255}
                  />
                </div>
                <div>
                  <Label htmlFor="content" className="mb-1 block">
                    <Trans>Problème rencontré</Trans>
                  </Label>
                  <Textarea
                    id="content"
                    disabled={sendReport.isPending}
                    placeholder={t`Décrivez le problème rencontré. L'étape et le guide seront automatiquement inclus.`}
                    name="content"
                    className="grow resize-none placeholder:text-xs xs:placeholder:text-sm placeholder:italic"
                    required
                    autoComplete="off"
                    autoCapitalize="off"
                    rows={10}
                    value={content}
                    onChange={(evt) => setContent(evt.currentTarget.value)}
                  />
                </div>
              </>
            )}

            {sendReport.isError && (
              <div className="break-all">
                <ErrorDisplay error={sendReport.error} />
              </div>
            )}

            {sendReport.isSuccess && (
              <>
                <div className="rounded-lg bg-green-600 px-4 py-2 text-primary-foreground">
                  <Trans>Votre message nous a été transmis. Bon jeu !</Trans>
                </div>
                <AlertDialogCancel>
                  <Trans>Fermer</Trans>
                </AlertDialogCancel>
              </>
            )}

            {!sendReport.isSuccess && (
              <AlertDialogFooter>
                <AlertDialogCancel>
                  <Trans>Annuler</Trans>
                </AlertDialogCancel>
                <AlertDialog>
                  <AlertDialogAction asChild>
                    <AlertDialogTrigger asChild>
                      <Button disabled={content.trim().length === 0 || sendReport.isPending}>
                        {sendReport.isPending ? <LoaderCircleIcon className="animate-spin" /> : <SendIcon />}
                        <Trans>Envoyer le message</Trans>
                      </Button>
                    </AlertDialogTrigger>
                  </AlertDialogAction>

                  <AlertDialogContent className="flex h-full max-h-[90vh] flex-col">
                    <AlertDialogHeader>
                      <AlertDialogTitle>
                        <Trans>Confirmer l'envoi du rapport</Trans>
                      </AlertDialogTitle>
                      <AlertDialogDescription>
                        <Trans>Récapitulatif du message</Trans>
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <ScrollArea className="-my-1 prose-sm h-full" type="auto">
                      <p className="break-all py-2">
                        {content
                          .trim()
                          .split('\n')
                          .filter((line) => line.trim().length > 0)
                          .map((line, index) => (
                            <Fragment key={index}>
                              {line}
                              <br />
                            </Fragment>
                          ))}
                      </p>
                    </ScrollArea>
                    <AlertDialogFooter>
                      <AlertDialogCancel>
                        <Trans>Annuler</Trans>
                      </AlertDialogCancel>
                      <AlertDialogAction asChild>
                        <Button
                          type="submit"
                          form="report-form"
                          disabled={content.trim().length === 0 || sendReport.isPending}
                        >
                          {sendReport.isPending ? <LoaderCircleIcon className="animate-spin" /> : <SendIcon />}
                          <Trans>Mon guide est à jour</Trans>
                        </Button>
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </AlertDialogFooter>
            )}
          </form>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}
