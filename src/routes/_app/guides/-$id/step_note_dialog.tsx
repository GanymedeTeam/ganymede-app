import { Trans, useLingui } from '@lingui/react/macro'
import { useSuspenseQuery } from '@tanstack/react-query'
import { SaveIcon, StickyNoteIcon, TrashIcon } from 'lucide-react'
import { useState } from 'react'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert_dialog.tsx'
import { Button } from '@/components/ui/button.tsx'
import { Textarea } from '@/components/ui/textarea.tsx'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip.tsx'
import { getStepNote } from '@/lib/step_notes.ts'
import { cn } from '@/lib/utils.ts'
import { useSetStepNote } from '@/mutations/set_step_note.mutation.ts'
import { confQuery } from '@/queries/conf.query.ts'
import { stepNotesQuery } from '@/queries/step_notes.query.ts'

const MAX_NOTE_LEN = 1000

export function StepNoteDialog({ guideId, stepIndex }: { guideId: number; stepIndex: number }) {
  const { t } = useLingui()
  const conf = useSuspenseQuery(confQuery)
  const stepNotes = useSuspenseQuery(stepNotesQuery)
  const setStepNote = useSetStepNote()
  const [open, setOpen] = useState(false)
  const [draft, setDraft] = useState('')
  const [snapshotHadNote, setSnapshotHadNote] = useState(false)

  const profileId = conf.data.profileInUse
  const currentNote = getStepNote(stepNotes.data, profileId, guideId, stepIndex) ?? ''
  const hasNote = currentNote.trim() !== ''

  const handleOpenChange = (next: boolean) => {
    setOpen(next)

    if (next) {
      setDraft(currentNote)
      setSnapshotHadNote(hasNote)
    } else {
      setTimeout(() => {
        setDraft('')
        setSnapshotHadNote(false)
      }, 200)
    }
  }

  const handleSave = () => {
    setStepNote.mutate({ profileId, guideId, stepIndex, note: draft })
    setOpen(false)
  }

  const handleDelete = () => {
    setStepNote.mutate({ profileId, guideId, stepIndex, note: null })
    setOpen(false)
  }

  return (
    <AlertDialog onOpenChange={handleOpenChange} open={open}>
      <TooltipProvider delayDuration={400}>
        <Tooltip>
          <TooltipTrigger asChild>
            <AlertDialogTrigger asChild>
              <Button className="size-6 sm:size-8" size="icon" variant="ghost">
                <StickyNoteIcon className={cn(hasNote && 'text-yellow-400')} />
              </Button>
            </AlertDialogTrigger>
          </TooltipTrigger>
          <TooltipContent>
            {hasNote ? <Trans>Modifier la note</Trans> : <Trans>Ajouter une note</Trans>}
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
      <AlertDialogContent className="max-h-[calc(var(--spacing-app-without-header)-var(--spacing-titlebar)-1rem)] overflow-auto p-3 sm:p-6">
        <AlertDialogHeader>
          <AlertDialogTitle>
            <Trans>Note personnelle</Trans>
          </AlertDialogTitle>
        </AlertDialogHeader>
        <div className="flex flex-col gap-2">
          <Textarea
            autoCapitalize="off"
            autoComplete="off"
            className="resize-none"
            maxLength={MAX_NOTE_LEN}
            onChange={(evt) => setDraft(evt.currentTarget.value)}
            placeholder={t`Écrivez votre note ici…`}
            rows={8}
            value={draft}
          />
          <p className="text-muted-foreground text-xs italic">
            <Trans>Note locale, non synchronisée avec le serveur.</Trans>
          </p>
        </div>
        <AlertDialogFooter className="flex-row justify-between gap-2 sm:justify-between">
          <div className="flex gap-2">
            <AlertDialogCancel>
              <Trans>Annuler</Trans>
            </AlertDialogCancel>
            {snapshotHadNote && (
              <Button onClick={handleDelete} type="button" variant="destructive">
                <TrashIcon />
                <Trans>Supprimer la note</Trans>
              </Button>
            )}
          </div>
          <AlertDialogAction asChild>
            <Button onClick={handleSave} type="button">
              <SaveIcon />
              <Trans>Enregistrer</Trans>
            </Button>
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
