import { Trans, useLingui } from '@lingui/react/macro'
import { BugIcon, LoaderCircleIcon, SendIcon } from 'lucide-react'
import { FormEvent, Fragment, useRef, useState } from 'react'
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
import { Dialog, DialogContent, DialogTitle, DialogTrigger } from '@/components/ui/dialog.tsx'
import { Input } from '@/components/ui/input.tsx'
import { Label } from '@/components/ui/label.tsx'
import { ScrollArea } from '@/components/ui/scroll_area.tsx'
import { Textarea } from '@/components/ui/textarea.tsx'
import { useReport } from '@/mutations/send_report.mutation.ts'

export function ReportDialog({ guideId, stepIndex }: { guideId: number; stepIndex: number }) {
  const { t } = useLingui()
  const [username, setUsername] = useState('')
  const [content, setContent] = useState('')
  const sendReport = useReport()
  const formRef = useRef<HTMLFormElement>(null)

  const handleSubmit = async (evt: FormEvent) => {
    evt.preventDefault()

    const form = evt.target as HTMLFormElement
    const formData = new FormData(form)
    const username = (formData.get('username') as string)?.trim() ?? ''
    const content = (formData.get('content') as string)?.trim() ?? ''

    await sendReport.mutateAsync({
      guide_id: guideId,
      step: stepIndex + 1,
      content,
      username: username === '' ? null : username,
    })
  }

  return (
    <>
      <Dialog
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
        <DialogTrigger asChild>
          <Button variant="ghost">
            <BugIcon />
          </Button>
        </DialogTrigger>
        <DialogContent>
          <DialogTitle>
            <Trans>Envoyer un rapport</Trans>
          </DialogTitle>
          <form ref={formRef} id="report-form" onSubmit={handleSubmit} className="flex flex-col gap-2">
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
              <div className="text-red-500">
                <p>{sendReport.error.message}</p>
                {sendReport.error.cause !== undefined && (
                  <>
                    <p>
                      <Trans>Causée par: {sendReport.error.status}</Trans>
                    </p>
                  </>
                )}
              </div>
            )}

            {sendReport.isSuccess && (
              <div className="rounded-lg bg-green-600 px-4 py-2 text-primary-foreground">
                <Trans>Votre message nous a été transmis. Bon jeu !</Trans>
              </div>
            )}

            {!sendReport.isSuccess && (
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button disabled={content.trim().length === 0 || sendReport.isPending}>
                    {sendReport.isPending ? <LoaderCircleIcon className="animate-spin" /> : <SendIcon />}
                    <Trans>Mon guide est à jour, envoyer le message</Trans>
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent className="slot-[overlay]:z-70 z-60 flex h-full max-h-[90vh] flex-col">
                  <AlertDialogHeader>
                    <AlertDialogTitle>
                      <Trans>Confirmer l'envoi du rapport</Trans>
                    </AlertDialogTitle>
                    <AlertDialogDescription>
                      <Trans>Récapitulatif du message</Trans>
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <ScrollArea className="-my-1 prose-sm h-full" type="auto">
                    <p className="py-2">
                      {formRef.current &&
                        (new FormData(formRef.current).get('content') as string)
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
                  <AlertDialogFooter className="xs:flex-row xs:items-center xs:justify-center">
                    <AlertDialogCancel className="mt-0 xs:h-9 xs:px-4 xs:text-sm">
                      <Trans>Annuler</Trans>
                    </AlertDialogCancel>
                    <AlertDialogAction asChild>
                      <Button
                        type="submit"
                        form="report-form"
                        disabled={content.trim().length === 0 || sendReport.isPending}
                        className="xs:h-9 xs:px-4 xs:text-sm [&_svg]:size-4"
                      >
                        {sendReport.isPending ? <LoaderCircleIcon className="animate-spin" /> : <SendIcon />}
                        <Trans>Je confirme que mon guide est à jour.</Trans>
                      </Button>
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            )}
          </form>
        </DialogContent>
      </Dialog>
    </>
  )
}
