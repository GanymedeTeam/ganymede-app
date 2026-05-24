import { Trans, useLingui } from '@lingui/react/macro'
import { useSuspenseQuery } from '@tanstack/react-query'
import { SaveIcon, StickyNoteIcon, TrashIcon } from 'lucide-react'
import { useEffect, useState } from 'react'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
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

function useHasNote(guideId: number, stepIndex: number) {
  const conf = useSuspenseQuery(confQuery)
  const stepNotes = useSuspenseQuery(stepNotesQuery)
  const profileId = conf.data.profileInUse
  const currentNote = getStepNote(stepNotes.data, profileId, guideId, stepIndex) ?? ''

  return { profileId, currentNote, hasNote: currentNote.trim() !== '' }
}

export function StepNoteDialogTrigger({
  guideId,
  stepIndex,
  onClick,
}: {
  guideId: number
  stepIndex: number
  onClick: () => void
}) {
  const { hasNote } = useHasNote(guideId, stepIndex)

  return (
    <TooltipProvider delayDuration={400}>
      <Tooltip>
        <TooltipTrigger asChild>
          <Button className="size-6 sm:size-8" onClick={onClick} size="icon" variant="ghost">
            <StickyNoteIcon className={cn(hasNote && 'text-yellow-400')} />
          </Button>
        </TooltipTrigger>
        <TooltipContent>{hasNote ? <Trans>Modifier la note</Trans> : <Trans>Ajouter une note</Trans>}</TooltipContent>
      </Tooltip>
    </TooltipProvider>
  )
}

export function StepNoteDialog({
  guideId,
  stepIndex,
  open,
  onOpenChange,
}: {
  guideId: number
  stepIndex: number
  open: boolean
  onOpenChange: (open: boolean) => void
}) {
  const { t } = useLingui()
  const { profileId, currentNote, hasNote } = useHasNote(guideId, stepIndex)
  const setStepNote = useSetStepNote()
  const [draft, setDraft] = useState('')
  const [snapshotHadNote, setSnapshotHadNote] = useState(false)

  // biome-ignore lint/correctness/useExhaustiveDependencies: snapshot only on open transition
  useEffect(() => {
    if (open) {
      setDraft(currentNote)
      setSnapshotHadNote(hasNote)
    } else {
      const id = setTimeout(() => {
        setDraft('')
        setSnapshotHadNote(false)
      }, 200)
      return () => clearTimeout(id)
    }
  }, [open])

  const handleSave = () => {
    setStepNote.mutate({ profileId, guideId, stepIndex, note: draft })
    onOpenChange(false)
  }

  const handleDelete = () => {
    setStepNote.mutate({ profileId, guideId, stepIndex, note: null })
    onOpenChange(false)
  }

  return (
    <AlertDialog onOpenChange={onOpenChange} open={open}>
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
