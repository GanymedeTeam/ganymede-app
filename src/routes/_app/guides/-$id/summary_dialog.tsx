import { Plural, Trans, useLingui } from '@lingui/react/macro'
import { useQuery } from '@tanstack/react-query'
import { BookTextIcon } from 'lucide-react'
import { useCallback, useState } from 'react'

import { CopyOnClick } from '@/components/copy_on_click.tsx'
import { GenericLoader } from '@/components/generic_loader.tsx'
import { GuideNodeImage } from '@/components/guide_node_image.tsx'
import { Button } from '@/components/ui/button.tsx'
import { ClearInput } from '@/components/ui/clear_input.tsx'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog.tsx'
import { ScrollArea } from '@/components/ui/scroll_area.tsx'
import { Skeleton } from '@/components/ui/skeleton.tsx'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip.tsx'
import { useGuideOrUndefined } from '@/hooks/use_guide.ts'
import { useHasVerticalScroll } from '@/hooks/use_has_vertical_scroll.ts'
import { GANYMEDE_HOST } from '@/lib/api.ts'
import { rankList } from '@/lib/rank.ts'
import { summaryQuery } from '@/queries/summary.query.ts'

export function SummaryDialogTrigger({ onClick }: { onClick: () => void }) {
  return (
    <TooltipProvider>
      <Tooltip delayDuration={400}>
        <TooltipTrigger asChild>
          <Button className="size-6 sm:size-8" onClick={onClick} size="icon" variant="ghost">
            <BookTextIcon />
          </Button>
        </TooltipTrigger>
        <TooltipContent>
          <Trans>Ouvrir le sommaire</Trans>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  )
}

export function SummaryDialog({
  guideId,
  onChangeStep,
  open,
  onOpenChange,
}: {
  guideId: number
  onChangeStep: (step: number) => void
  open: boolean
  onOpenChange: (open: boolean) => void
}) {
  const { t } = useLingui()
  const [searchTerm, setSearchTerm] = useState('')
  const summary = useQuery({
    ...summaryQuery(guideId),
    enabled: open,
  })
  const guide = useGuideOrUndefined(guideId)
  const [elementRef, setElementRef] = useState<HTMLDivElement | null>(null)
  const contentRef = useCallback((node: HTMLDivElement) => {
    setElementRef(node)

    return () => {
      setElementRef(null)
    }
  }, [])
  const hasScroll = useHasVerticalScroll(!open ? null : elementRef)

  const filteredQuests = summary.isSuccess
    ? rankList({
        list: summary.data.quests,
        keys: [(quest) => quest.name],
        term: searchTerm,
      })
    : []

  if (!guide) {
    return null
  }

  return (
    <Dialog onOpenChange={onOpenChange} open={open}>
      <DialogContent className="flex h-full max-h-[89vh] flex-col px-3 sm:px-6">
        <DialogHeader>
          <div className="flex items-center gap-2">
            <GuideNodeImage guide={guide} />
            <DialogTitle>{guide.name}</DialogTitle>
          </div>
          <DialogDescription className="sr-only">
            <span className="relative">
              <Trans>Sommaire</Trans>
              {!summary.isLoading && summary.isFetching && (
                <GenericLoader className="absolute top-0 left-full ml-1 size-4 translate-y-0.5" />
              )}
            </span>
          </DialogDescription>
        </DialogHeader>
        {summary.isSuccess && summary.data.quests.length > 0 && (
          <ClearInput
            autoComplete="off"
            autoCorrect="off"
            className="bg-surface-inset"
            disabled={!summary.isSuccess}
            onChange={(evt) => setSearchTerm(evt.currentTarget.value)}
            onValueChange={setSearchTerm}
            placeholder={t`Rechercher une quête`}
            value={searchTerm}
          />
        )}
        {summary.isSuccess && summary.data.quests.length === 0 && (
          <p className="text-center">
            <Trans>Aucune quête dans ce guide.</Trans>
          </p>
        )}
        {summary.isSuccess && summary.data.quests.length !== 0 && filteredQuests.length === 0 && searchTerm && (
          <p className="text-center">
            <Trans>Aucune quête ne correspond à votre recherche.</Trans>
          </p>
        )}
        {summary.isLoading && (
          <ScrollArea className="h-full">
            <div className="flex flex-col gap-2">
              <Skeleton className="h-15 bg-surface-inset" />
              <Skeleton className="h-15 bg-surface-inset" />
              <Skeleton className="h-15 bg-surface-inset" />
              <Skeleton className="h-15 bg-surface-inset" />
            </div>
          </ScrollArea>
        )}
        {summary.isError && (
          <div className="flex flex-col gap-2">
            <p>
              <Trans>Impossible de récupérer le sommaire du guide.</Trans>
            </p>
            <p className="rounded-lg bg-destructive p-2 text-destructive-foreground">
              {summary.error instanceof Error ? summary.error.message : String(summary.error)}
            </p>
          </div>
        )}
        {summary.isSuccess && (
          <ScrollArea className="h-full" ref={contentRef}>
            <div className="group flex flex-col gap-2" data-has-scroll={hasScroll}>
              {filteredQuests.map((quest) => (
                <div
                  className="flex flex-col rounded-lg p-2 text-left group-data-[has-scroll=true]:mr-3"
                  key={quest.name}
                >
                  <div className="flex items-center gap-1">
                    <img alt="Quest" className="size-6" src={`https://${GANYMEDE_HOST}/images/icon_quest.png`} />
                    <CopyOnClick title={quest.name}>
                      <span className="font-semibold text-[#eb5bc6]">{quest.name}</span>
                    </CopyOnClick>
                  </div>
                  <span className="flex flex-col gap-1">
                    <Plural one="Étape" other="Étapes" value={quest.statuses.length} />{' '}
                    <div className="flex flex-wrap gap-1">
                      {quest.statuses.map((status) => {
                        const statusText =
                          'started' in status
                            ? 'started'
                            : 'inProgress' in status
                              ? 'inProgress'
                              : 'completed' in status
                                ? 'completed'
                                : 'setup'
                        const step =
                          'started' in status
                            ? status.started
                            : 'inProgress' in status
                              ? status.inProgress
                              : 'completed' in status
                                ? status.completed
                                : status.setup

                        return (
                          <TooltipProvider key={`${statusText}-${step}`}>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Button
                                  className="border-none text-foreground data-[status=completed]:text-green-500 data-[status=setup]:text-orange-400 data-[status=started]:text-red-500"
                                  data-status={statusText}
                                  onClick={() => {
                                    onChangeStep(step - 1)
                                    onOpenChange(false)
                                  }}
                                >
                                  {step}
                                </Button>
                              </TooltipTrigger>
                              <TooltipContent>
                                {statusText === 'completed' && <Trans>Fin</Trans>}
                                {statusText === 'started' && <Trans>Début</Trans>}
                                {statusText === 'inProgress' && <Trans>En cours</Trans>}
                                {statusText === 'setup' && <Trans>Préparation</Trans>}
                              </TooltipContent>
                            </Tooltip>
                          </TooltipProvider>
                        )
                      })}
                    </div>
                  </span>
                </div>
              ))}
            </div>
          </ScrollArea>
        )}
      </DialogContent>
    </Dialog>
  )
}
