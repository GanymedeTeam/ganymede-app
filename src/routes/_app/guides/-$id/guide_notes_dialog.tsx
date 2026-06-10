import { Trans } from '@lingui/react/macro'
import { useSuspenseQuery } from '@tanstack/react-query'
import {
  ArrowRightIcon,
  BellIcon,
  EllipsisVerticalIcon,
  ListIcon,
  PencilIcon,
  StickyNoteIcon,
  TrashIcon,
} from 'lucide-react'
import { useCallback, useState } from 'react'

import { GuideNodeImage } from '@/components/guide_node_image.tsx'
import { Badge } from '@/components/ui/badge.tsx'
import { Button } from '@/components/ui/button.tsx'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog.tsx'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown_menu.tsx'
import { ScrollArea } from '@/components/ui/scroll_area.tsx'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip.tsx'
import { useGuideOrUndefined } from '@/hooks/use_guide.ts'
import { useHasVerticalScroll } from '@/hooks/use_has_vertical_scroll.ts'
import { getStepNote } from '@/lib/step_notes.ts'
import { cn } from '@/lib/utils.ts'
import { useSetStepNote } from '@/mutations/set_step_note.mutation.ts'
import { confQuery } from '@/queries/conf.query.ts'
import { stepNotesQuery } from '@/queries/step_notes.query.ts'

export function GuideNotesMenuTrigger({
  guideId,
  stepIndex,
  onOpenNote,
  onOpenGuideNotes,
}: {
  guideId: number
  stepIndex: number
  onOpenNote: () => void
  onOpenGuideNotes: () => void
}) {
  const conf = useSuspenseQuery(confQuery)
  const stepNotes = useSuspenseQuery(stepNotesQuery)
  const currentNote = getStepNote(stepNotes.data, conf.data.profileInUse, guideId, stepIndex)?.content ?? ''
  const hasNote = currentNote.trim() !== ''

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button className="size-6 sm:size-8" size="icon" variant="ghost">
          <StickyNoteIcon className={cn(hasNote && 'text-yellow-400')} />
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
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

export function GuideNotesDialog({
  guideId,
  open,
  onOpenChange,
  onEditStep,
  onGoToStep,
}: {
  guideId: number
  open: boolean
  onOpenChange: (open: boolean) => void
  onEditStep: (stepIndex: number) => void
  onGoToStep: (stepIndex: number) => void
}) {
  const conf = useSuspenseQuery(confQuery)
  const stepNotes = useSuspenseQuery(stepNotesQuery)
  const guide = useGuideOrUndefined(guideId)
  const setStepNote = useSetStepNote()
  const profileId = conf.data.profileInUse

  const [elementRef, setElementRef] = useState<HTMLDivElement | null>(null)
  const contentRef = useCallback((node: HTMLDivElement) => {
    setElementRef(node)

    return () => {
      setElementRef(null)
    }
  }, [])
  const hasScroll = useHasVerticalScroll(elementRef)

  const steps = stepNotes.data.profiles[profileId]?.guides[guideId]?.steps ?? {}
  const notes = Object.entries(steps)
    .flatMap(([key, note]) =>
      note && note.content.trim() !== '' ? [{ stepIndex: Number.parseInt(key, 10), note }] : [],
    )
    .sort((a, b) => a.stepIndex - b.stepIndex)

  if (!guide) {
    return null
  }

  return (
    <Dialog onOpenChange={onOpenChange} open={open}>
      <DialogContent className="flex h-full max-h-[89vh] flex-col px-3 sm:px-6">
        <DialogHeader>
          <div className="flex items-center gap-2 pr-7">
            <GuideNodeImage guide={guide} />
            <DialogTitle className="min-w-0 truncate">{guide.name}</DialogTitle>
          </div>
          <DialogDescription className="sr-only">
            <Trans>Notes du guide</Trans>
          </DialogDescription>
        </DialogHeader>
        {notes.length === 0 ? (
          <p className="text-center">
            <Trans>Aucune note dans ce guide.</Trans>
          </p>
        ) : (
          <ScrollArea className="h-full" ref={contentRef}>
            <TooltipProvider delayDuration={400}>
              <div className="group flex flex-col gap-2" data-has-scroll={hasScroll}>
                {notes.map(({ stepIndex, note }) => {
                  const stepNumber = stepIndex + 1
                  const stepName = guide.steps[stepIndex]?.name?.trim()

                  return (
                    <div
                      className="flex flex-col gap-1.5 rounded-lg bg-surface-inset p-2 text-left group-data-[has-scroll=true]:mr-3"
                      key={stepIndex}
                    >
                      <div className="flex items-center gap-1.5">
                        <Badge className="shrink-0" variant="secondary">
                          <Trans>Étape {stepNumber}</Trans>
                        </Badge>
                        {stepName && <span className="min-w-0 truncate text-sm text-muted-foreground">{stepName}</span>}
                        {note.is_reminder && (
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <BellIcon className="size-3.5 shrink-0 text-yellow-400" />
                            </TooltipTrigger>
                            <TooltipContent>
                              <Trans>Rappel activé</Trans>
                            </TooltipContent>
                          </Tooltip>
                        )}
                        <div className="ml-auto hidden shrink-0 items-center gap-0.5 xs:flex">
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button onClick={() => onGoToStep(stepIndex)} size="icon-sm" variant="ghost">
                                <ArrowRightIcon />
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent>
                              <Trans>Aller à l'étape</Trans>
                            </TooltipContent>
                          </Tooltip>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button onClick={() => onEditStep(stepIndex)} size="icon-sm" variant="ghost">
                                <PencilIcon />
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent>
                              <Trans>Modifier</Trans>
                            </TooltipContent>
                          </Tooltip>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button
                                onClick={() =>
                                  setStepNote.mutate({ profileId, guideId, stepIndex, note: null, isReminder: false })
                                }
                                size="icon-sm"
                                variant="ghost"
                              >
                                <TrashIcon className="text-destructive" />
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent>
                              <Trans>Supprimer</Trans>
                            </TooltipContent>
                          </Tooltip>
                        </div>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button className="ml-auto shrink-0 xs:hidden" size="icon-sm" variant="ghost">
                              <EllipsisVerticalIcon />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent>
                            <DropdownMenuItem onSelect={() => onGoToStep(stepIndex)}>
                              <ArrowRightIcon />
                              <Trans>Aller à l'étape</Trans>
                            </DropdownMenuItem>
                            <DropdownMenuItem onSelect={() => onEditStep(stepIndex)}>
                              <PencilIcon />
                              <Trans>Modifier</Trans>
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              className="text-destructive focus:text-destructive"
                              onSelect={() =>
                                setStepNote.mutate({ profileId, guideId, stepIndex, note: null, isReminder: false })
                              }
                            >
                              <TrashIcon />
                              <Trans>Supprimer</Trans>
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                      <p className="text-sm break-words whitespace-pre-wrap">{note.content}</p>
                    </div>
                  )
                })}
              </div>
            </TooltipProvider>
          </ScrollArea>
        )}
      </DialogContent>
    </Dialog>
  )
}
