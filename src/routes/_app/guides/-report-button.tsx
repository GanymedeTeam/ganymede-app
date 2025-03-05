import { Button } from '@/components/ui/button.tsx'
import { Dialog, DialogContent, DialogTitle, DialogTrigger } from '@/components/ui/dialog.tsx'
import { Input } from '@/components/ui/input.tsx'
import { Label } from '@/components/ui/label.tsx'
import { Textarea } from '@/components/ui/textarea.tsx'
import { useReport } from '@/mutations/send-report.mutation.ts'
import { Trans, useLingui } from '@lingui/react/macro'
import { BugIcon, LoaderCircleIcon, SendIcon } from 'lucide-react'
import { FormEvent, useState } from 'react'

export function ReportButton({
  guideId,
  stepIndex,
}: {
  guideId: number
  stepIndex: number
}) {
  const { t } = useLingui()
  const [username, setUsername] = useState('')
  const [content, setContent] = useState('')
  const sendReport = useReport()

  const handleSubmit = async (evt: FormEvent) => {
    evt.preventDefault()

    const form = evt.target as HTMLFormElement
    const formData = new FormData(form)
    const username = (formData.get('username') as string).trim()
    const content = (formData.get('content') as string).trim()

    await sendReport.mutateAsync({
      guide_id: guideId,
      step: stepIndex + 1,
      content,
      username,
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
          <form onSubmit={handleSubmit} className="flex flex-col gap-2">
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
                <Trans>Votre message nous a été transmi. Bon jeu !</Trans>
              </div>
            )}

            {!sendReport.isSuccess && (
              <Button type="submit" disabled={content.trim().length === 0 || sendReport.isPending}>
                {sendReport.isPending ? <LoaderCircleIcon className="animate-spin" /> : <SendIcon />}
                <Trans>Envoyer</Trans>
              </Button>
            )}
          </form>
        </DialogContent>
      </Dialog>
    </>
  )
}
