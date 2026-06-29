import { Trans, useLingui } from '@lingui/react/macro'
import { useSuspenseQuery } from '@tanstack/react-query'
import { CheckIcon, ChevronsUpDownIcon, SaveIcon, TrashIcon } from 'lucide-react'
import { useCallback, useEffect, useRef, useState } from 'react'

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
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command.tsx'
import { Input } from '@/components/ui/input.tsx'
import { Label } from '@/components/ui/label.tsx'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover.tsx'
import { ScrollArea } from '@/components/ui/scroll_area.tsx'
import { Switch } from '@/components/ui/switch.tsx'
import { Textarea } from '@/components/ui/textarea.tsx'
import { useHasVerticalScroll } from '@/hooks/use_has_vertical_scroll.ts'
import { getStepNote } from '@/lib/step_notes.ts'
import { cn } from '@/lib/utils.ts'
import { useSetStepNote } from '@/mutations/set_step_note.mutation.ts'
import { confQuery } from '@/queries/conf.query.ts'
import { guidesQuery } from '@/queries/guides.query.ts'
import { stepNotesQuery } from '@/queries/step_notes.query.ts'

const MAX_NOTE_LEN = 1000

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
  const conf = useSuspenseQuery(confQuery)
  const stepNotes = useSuspenseQuery(stepNotesQuery)
  const guides = useSuspenseQuery(guidesQuery())
  const setStepNote = useSetStepNote()
  const profileId = conf.data.profileInUse

  const [selectedGuideId, setSelectedGuideId] = useState(guideId)
  const [selectedStepIndex, setSelectedStepIndex] = useState(stepIndex)
  const [stepInputValue, setStepInputValue] = useState(() => String(stepIndex + 1))
  const [draft, setDraft] = useState('')
  const [reminder, setReminder] = useState(true)
  const [guideSelectOpen, setGuideSelectOpen] = useState(false)

  const selectedGuide = guides.data.find((guide) => guide.id === selectedGuideId)
  const maxStep = selectedGuide ? selectedGuide.steps.length - 1 : 0
  const targetNote = getStepNote(stepNotes.data, profileId, selectedGuideId, selectedStepIndex)
  const targetHasNote = (targetNote?.content.trim() ?? '') !== ''

  const prevOpen = useRef(false)

  const [elementRef, setElementRef] = useState<HTMLDivElement | null>(null)
  const contentRef = useCallback((node: HTMLDivElement) => {
    setElementRef(node)

    return () => {
      setElementRef(null)
    }
  }, [])

  // oxlint-disable react-hooks/exhaustive-deps -- load target note imperatively, not on every query update
  useEffect(() => {
    if (open && !prevOpen.current) {
      setSelectedGuideId(guideId)
      setSelectedStepIndex(stepIndex)
      setStepInputValue(String(stepIndex + 1))

      const note = getStepNote(stepNotes.data, profileId, guideId, stepIndex)
      setDraft(note?.content ?? '')
      setReminder(note?.is_reminder ?? false)
    }

    prevOpen.current = open
  }, [open])

  useEffect(() => {
    if (!open || !prevOpen.current) return

    const note = getStepNote(stepNotes.data, profileId, selectedGuideId, selectedStepIndex)
    setDraft(note?.content ?? '')
    setReminder(note?.is_reminder ?? false)
    setStepInputValue(String(selectedStepIndex + 1))
  }, [selectedGuideId, selectedStepIndex])
  // oxlint-enable react-hooks/exhaustive-deps

  const handleSelectGuide = (id: number) => {
    const guide = guides.data.find((g) => g.id === id)
    const nextMaxStep = guide ? guide.steps.length - 1 : 0

    setSelectedGuideId(id)
    const nextStep = Math.min(selectedStepIndex, nextMaxStep)
    setSelectedStepIndex(nextStep)
    setStepInputValue(String(nextStep + 1))
    setGuideSelectOpen(false)
  }

  const handleChangeStep = (value: string) => {
    setStepInputValue(value)

    if (value.trim() === '') return

    const parsed = Number.parseInt(value, 10)
    if (Number.isNaN(parsed)) return

    const clamped = Math.max(0, Math.min(maxStep, parsed - 1))
    setSelectedStepIndex(clamped)
  }

  const handleSave = () => {
    setStepNote.mutate({
      profileId,
      guideId: selectedGuideId,
      stepIndex: selectedStepIndex,
      note: draft,
      isReminder: reminder,
    })
    onOpenChange(false)
  }

  const handleDelete = () => {
    setStepNote.mutate({
      profileId,
      guideId: selectedGuideId,
      stepIndex: selectedStepIndex,
      note: null,
      isReminder: false,
    })
    onOpenChange(false)
  }
  const hasScroll = useHasVerticalScroll(elementRef)

  return (
    <AlertDialog onOpenChange={onOpenChange} open={open}>
      <AlertDialogContent className="flex h-full max-h-[89vh] flex-col p-3 sm:p-6">
        <AlertDialogHeader>
          <AlertDialogTitle>
            <Trans>Note personnelle</Trans>
          </AlertDialogTitle>
        </AlertDialogHeader>
        <ScrollArea className="h-full" ref={contentRef}>
          <div className="group flex flex-col gap-3 px-2 data-[has-scroll=true]:mr-3" data-has-scroll={hasScroll}>
            <div className="flex flex-col gap-1.5">
              <Label>
                <Trans>Guide</Trans>
              </Label>
              <Popover onOpenChange={setGuideSelectOpen} open={guideSelectOpen}>
                <PopoverTrigger asChild>
                  <Button
                    aria-expanded={guideSelectOpen}
                    className="w-full justify-between font-normal"
                    role="combobox"
                    variant="outline"
                  >
                    <span className="truncate">{selectedGuide?.name ?? t`Choisir un guide`}</span>
                    <ChevronsUpDownIcon className="ml-2 size-4 shrink-0 opacity-50" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent align="start" className="w-(--radix-popover-trigger-width) p-0">
                  <Command>
                    <CommandInput placeholder={t`Rechercher un guide…`} />
                    <CommandList onWheel={(evt) => evt.stopPropagation()}>
                      <CommandEmpty>
                        <Trans>Aucun guide trouvé.</Trans>
                      </CommandEmpty>
                      <CommandGroup>
                        {guides.data.map((guide) => (
                          <CommandItem
                            key={guide.id}
                            onSelect={() => handleSelectGuide(guide.id)}
                            value={`${guide.name} ${guide.id}`}
                          >
                            <CheckIcon
                              className={cn('size-4', guide.id === selectedGuideId ? 'opacity-100' : 'opacity-0')}
                            />
                            <span className="truncate">{guide.name}</span>
                          </CommandItem>
                        ))}
                      </CommandGroup>
                    </CommandList>
                  </Command>
                </PopoverContent>
              </Popover>
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="step-note-step">
                <Trans>Étape</Trans>
              </Label>
              <Input
                id="step-note-step"
                max={maxStep + 1}
                min={1}
                onBlur={() => setStepInputValue(String(selectedStepIndex + 1))}
                onChange={(evt) => handleChangeStep(evt.currentTarget.value)}
                type="number"
                value={stepInputValue}
              />
            </div>
            <Textarea
              autoCapitalize="off"
              autoComplete="off"
              className="resize-none"
              maxLength={MAX_NOTE_LEN}
              onChange={(evt) => setDraft(evt.currentTarget.value)}
              placeholder={t`Écrivez votre note ici…`}
              rows={6}
              value={draft}
            />
            <div className="flex items-center justify-between gap-2">
              <Label className="cursor-pointer" htmlFor="step-note-reminder">
                <Trans>Me notifier sur cette étape</Trans>
              </Label>
              <Switch checked={reminder} id="step-note-reminder" onCheckedChange={setReminder} />
            </div>
            <p className="text-xs text-muted-foreground italic">
              <Trans>Note locale, non synchronisée avec le serveur.</Trans>
            </p>
          </div>
        </ScrollArea>
        <AlertDialogFooter className="flex-col gap-2 xs:flex-row xs:flex-wrap xs:justify-between sm:justify-between">
          <div className="flex flex-col gap-2 xs:flex-row">
            <AlertDialogCancel>
              <Trans>Annuler</Trans>
            </AlertDialogCancel>
            {targetHasNote && (
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
