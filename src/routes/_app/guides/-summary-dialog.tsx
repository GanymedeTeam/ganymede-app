import { GenericLoader } from '@/components/generic-loader.tsx'
import { Button } from '@/components/ui/button.tsx'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog.tsx'
import { ScrollArea } from '@/components/ui/scroll-area.tsx'
import { Skeleton } from '@/components/ui/skeleton.tsx'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip.tsx'
import { useGuideOrUndefined } from '@/hooks/use_guide.ts'
import { summaryQuery } from '@/queries/summary.query.ts'
import { Plural, Trans } from '@lingui/react/macro'
import { useQuery } from '@tanstack/react-query'
import debounce from 'debounce-fn'
import { BookTextIcon } from 'lucide-react'
import { useCallback, useState, useSyncExternalStore } from 'react'

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

export function SummaryDialog({
  guideId,
  onChangeStep,
}: {
  guideId: number
  onChangeStep: (step: number) => void
}) {
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
              {summary.data.quests.length === 0 && (
                <p className="text-center">
                  <Trans>Aucune quête dans ce guide.</Trans>
                </p>
              )}
              {summary.data.quests.map((quest) => {
                const firstStatus = quest.statuses[0]
                const firstStep =
                  'started' in firstStatus
                    ? firstStatus.started
                    : 'inProgress' in firstStatus
                      ? firstStatus.inProgress
                      : firstStatus.completed

                return (
                  <TooltipProvider delayDuration={1000} key={quest.name}>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <button
                          onClick={() => {
                            onChangeStep(firstStep - 1)
                            setOpen(false)
                          }}
                          className="flex flex-col rounded-lg bg-primary-800 p-2 text-left hover:bg-primary group-data-[has-scroll=true]:mr-3"
                        >
                          <div className="flex items-center gap-1">
                            <img src="https://ganymede-dofus.com/images/icon_quest.png" className="size-6" />
                            <span className="font-semibold text-[#eb5bc6]">{quest.name}</span>
                          </div>
                          <span>
                            <Plural value={quest.statuses.length} one="Étape" other="Étapes" />{' '}
                            {quest.statuses
                              .map((status) => {
                                if ('started' in status) {
                                  return <span key={`started-${status.started}`}>{status.started}</span>
                                }

                                if ('completed' in status) {
                                  return (
                                    <span key={`completed-${status.completed}`} className="text-green-500">
                                      {status.completed}
                                    </span>
                                  )
                                }

                                return <span key={`inProgress-${status.inProgress}`}>{status.inProgress}</span>
                              })
                              .reduce((acc, curr) => (
                                <>
                                  {acc}, {curr}
                                </>
                              ))}
                          </span>
                        </button>
                      </TooltipTrigger>
                      <TooltipContent>
                        <Trans>Aller à l'étape</Trans>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                )
              })}
            </div>
          </ScrollArea>
        )}
      </DialogContent>
    </Dialog>
  )
}
