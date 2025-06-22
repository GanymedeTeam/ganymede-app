import { Plural, Trans, useLingui } from '@lingui/react/macro'
import { useQuery } from '@tanstack/react-query'
import debounce from 'debounce-fn'
import { BookTextIcon } from 'lucide-react'
import { useCallback, useState, useSyncExternalStore } from 'react'
import { GenericLoader } from '@/components/generic_loader.tsx'
import { Button } from '@/components/ui/button.tsx'
import { ClearInput } from '@/components/ui/clear_input.tsx'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog.tsx'
import { ScrollArea } from '@/components/ui/scroll_area.tsx'
import { Skeleton } from '@/components/ui/skeleton.tsx'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip.tsx'
import { useGuideOrUndefined } from '@/hooks/use_guide.ts'
import { rankList } from '@/lib/rank.ts'
import { summaryQuery } from '@/queries/summary.query.ts'

function useHasVerticalScroll(element: HTMLElement | null) {
  const subscribe = useCallback(
    (onStoreChange: () => void) => {
      if (!element) {
        return () => {
          // noop
        }
      }

      const onResize = debounce(onStoreChange, { wait: 500 })

      window.addEventListener('resize', onResize)

      let observer: MutationObserver | null = null

      if (element) {
        observer = new MutationObserver(onStoreChange)
        observer.observe(element, { attributes: true, childList: true, subtree: true })
      }

      return () => {
        window.removeEventListener('resize', onResize)

        observer?.disconnect()
      }
    },
    [element],
  )

  const getSnapshot = useCallback(() => {
    if (!element) {
      return false
    }

    return element.scrollHeight > element.clientHeight
  }, [element])

  return useSyncExternalStore(subscribe, getSnapshot)
}

export function SummaryDialog({ guideId, onChangeStep }: { guideId: number; onChangeStep: (step: number) => void }) {
  const { t } = useLingui()
  const [searchTerm, setSearchTerm] = useState('')
  const [open, setOpen] = useState(false)
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
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="icon" variant="ghost">
          <BookTextIcon />
        </Button>
      </DialogTrigger>
      <DialogContent className="flex h-full max-h-[90vh] flex-col">
        <DialogHeader>
          <DialogTitle>{guide.name}</DialogTitle>
          <DialogDescription>
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
            value={searchTerm}
            onChange={(evt) => setSearchTerm(evt.currentTarget.value)}
            onValueChange={setSearchTerm}
            autoComplete="off"
            autoCorrect="off"
            placeholder={t`Rechercher une quête`}
            disabled={!summary.isSuccess}
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
              <Skeleton className="h-15 bg-primary/30" />
              <Skeleton className="h-15 bg-primary/30" />
              <Skeleton className="h-18 bg-primary/30" />
              <Skeleton className="h-16 bg-primary/30" />
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
                <div className="flex flex-col rounded-lg p-2 text-left group-data-[has-scroll=true]:mr-3">
                  <div className="flex items-center gap-1">
                    <img src="https://ganymede-dofus.com/images/icon_quest.png" className="size-6" />
                    <span className="font-semibold text-[#eb5bc6]">{quest.name}</span>
                  </div>
                  <span className="flex flex-col gap-1">
                    <Plural value={quest.statuses.length} one="Étape" other="Étapes" />{' '}
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
                          <TooltipProvider>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Button
                                  key={`${statusText}-${step}`}
                                  onClick={() => {
                                    onChangeStep(step - 1)
                                    setOpen(false)
                                  }}
                                  className="bg-accent data-[status=completed]:text-green-500 data-[status=setup]:text-orange-400 data-[status=started]:text-red-500"
                                  data-status={statusText}
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
