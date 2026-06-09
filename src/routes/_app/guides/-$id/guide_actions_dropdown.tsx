import { Trans } from '@lingui/react/macro'
import { useSuspenseQuery } from '@tanstack/react-query'
import { BookTextIcon, BugIcon, CircleEllipsisIcon, ListIcon, StickyNoteIcon } from 'lucide-react'

import { Button } from '@/components/ui/button.tsx'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown_menu.tsx'
import { getStepNote } from '@/lib/step_notes.ts'
import { cn } from '@/lib/utils.ts'
import { confQuery } from '@/queries/conf.query.ts'
import { stepNotesQuery } from '@/queries/step_notes.query.ts'

export function GuideActionsDropdown({
  guideId,
  stepIndex,
  showSummary,
  showReport,
  onOpenNote,
  onOpenGuideNotes,
  onOpenSummary,
  onOpenReport,
}: {
  guideId: number
  stepIndex: number
  showSummary: boolean
  showReport: boolean
  onOpenNote: () => void
  onOpenGuideNotes: () => void
  onOpenSummary: () => void
  onOpenReport: () => void
}) {
  const conf = useSuspenseQuery(confQuery)
  const stepNotes = useSuspenseQuery(stepNotesQuery)
  const currentNote = getStepNote(stepNotes.data, conf.data.profileInUse, guideId, stepIndex)?.content ?? ''
  const hasNote = currentNote.trim() !== ''

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button className="[&_svg]:size-4" size="icon-sm" variant="ghost">
          <CircleEllipsisIcon className={cn(hasNote && 'text-yellow-400')} />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent>
        <DropdownMenuItem onSelect={onOpenNote}>
          <StickyNoteIcon className={cn(hasNote && 'text-yellow-400')} />
          {hasNote ? <Trans>Modifier la note</Trans> : <Trans>Ajouter une note</Trans>}
        </DropdownMenuItem>
        <DropdownMenuItem onSelect={onOpenGuideNotes}>
          <ListIcon />
          <Trans>Voir les notes du guide</Trans>
        </DropdownMenuItem>
        {showSummary && (
          <DropdownMenuItem onSelect={onOpenSummary}>
            <BookTextIcon />
            <Trans>Ouvrir le sommaire</Trans>
          </DropdownMenuItem>
        )}
        {showReport && (
          <DropdownMenuItem onSelect={onOpenReport}>
            <BugIcon />
            <Trans>Rapporter un problème</Trans>
          </DropdownMenuItem>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
