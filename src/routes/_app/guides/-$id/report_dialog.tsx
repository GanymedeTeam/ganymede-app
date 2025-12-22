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
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip.tsx'
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
        <TooltipProvider delayDuration={400}>
          <Tooltip>
            <TooltipTrigger asChild>
              <AlertDialogTrigger asChild>
                <Button className="size-6 sm:size-8" size="icon" variant="ghost">
                  <BugIcon />
                </Button>
              </AlertDialogTrigger>
            </TooltipTrigger>
            <TooltipContent>
              <Trans>Rapporter un problème</Trans>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
        <AlertDialogContent className="max-h-[calc(var(--spacing-app-without-header)-var(--spacing-titlebar)-1rem)] overflow-auto p-3 sm:p-6">
          <AlertDialogTitle>
            <Trans>Envoyer un rapport</Trans>
          </AlertDialogTitle>
          <form className="flex flex-col gap-2" id="report-form" onSubmit={handleSubmit}>
            {!sendReport.isSuccess && (
              <>
                <div>
                  <Label className="mb-1 block" htmlFor="username">
                    <Trans>Votre pseudo</Trans>
                  </Label>
                  <Input
                    className="placeholder:italic"
                    disabled={sendReport.isPending}
                    id="username"
                    maxLength={255}
                    name="username"
                    onChange={(evt) => setUsername(evt.currentTarget.value)}
                    placeholder={t`Votre pseudo`}
                    value={username}
                  />
                </div>
                <div>
                  <Label className="mb-1 block" htmlFor="content">
                    <Trans>Problème rencontré</Trans>
                  </Label>
                  <Textarea
                    autoCapitalize="off"
                    autoComplete="off"
                    className="grow resize-none placeholder:text-xs xs:placeholder:text-sm placeholder:italic"
                    disabled={sendReport.isPending}
                    id="content"
                    name="content"
                    onChange={(evt) => setContent(evt.currentTarget.value)}
                    placeholder={t`Décrivez le problème rencontré. L'étape et le guide seront automatiquement inclus.`}
                    required
                    rows={10}
                    value={content}
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
                          disabled={content.trim().length === 0 || sendReport.isPending}
                          form="report-form"
                          type="submit"
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
