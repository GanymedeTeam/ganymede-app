import { Trans } from '@lingui/react/macro'
import { useSuspenseQuery } from '@tanstack/react-query'
import { useNavigate } from '@tanstack/react-router'
import { debug } from '@tauri-apps/plugin-log'
import { XIcon } from 'lucide-react'
import { type PointerEvent as ReactPointerEvent, useEffect } from 'react'
import { GuideNodeImage } from '@/components/guide_node_image.tsx'
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuSeparator,
  ContextMenuTrigger,
} from '@/components/ui/context_menu.tsx'
import { TabsTrigger } from '@/components/ui/tabs.tsx'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip.tsx'
import { useGuideOrUndefined } from '@/hooks/use_guide.ts'
import { useProfile } from '@/hooks/use_profile.ts'
import { useTabs } from '@/hooks/use_tabs.ts'
import { clamp } from '@/lib/clamp.ts'
import { getStepOr } from '@/lib/progress.ts'
import { OpenedGuideDropPosition } from '@/lib/tabs.ts'
import { cn } from '@/lib/utils.ts'
import { useRegisterGuideClose } from '@/mutations/register_guide_close.mutation.ts'
import { confQuery } from '@/queries/conf.query.ts'

type GuideTabsTriggerProps = {
  id: number
  currentId: number
  dropPosition: OpenedGuideDropPosition | null
  isDragging: boolean
  onTabPointerDown: (evt: ReactPointerEvent<HTMLDivElement>, id: number) => void
}

export function GuideTabsTrigger({ id, currentId, dropPosition, isDragging, onTabPointerDown }: GuideTabsTriggerProps) {
  const guide = useGuideOrUndefined(id)
  const removeTab = useTabs((s) => s.removeTab)
  const setTabs = useTabs((s) => s.setTabs)
  const registerGuideClose = useRegisterGuideClose()
  const tabs = useTabs((s) => s.tabs)
  const navigate = useNavigate()
  const profile = useProfile()
  const conf = useSuspenseQuery(confQuery)
  const isSmallGuide = conf.data.guideDisplay === 'Small'

  useEffect(() => {
    if (!guide) {
      removeTab(id)
      registerGuideClose.mutate({ guideId: id, profileId: profile.id })
    }
  }, [guide, id, removeTab, registerGuideClose, profile.id])

  if (!guide) {
    return null
  }

  const totalSteps = guide.steps.length
  const currentStep = profile.progresses.find((p) => p.id === id)?.currentStep ?? 0
  const progressPercent = totalSteps <= 1 ? 100 : (currentStep / (totalSteps - 1)) * 100
  const positionInList = tabs.findIndex((tab) => tab === id)
  const hasTabsToRight = positionInList !== -1 && positionInList < tabs.length - 1
  const hasOtherTabs = tabs.length > 1

  const onOpenTab = async () => {
    if (currentId === id) {
      return
    }

    await navigate({
      to: '/guides/$id',
      params: {
        id,
      },
      search: {
        step: getStepOr(profile, id, 0),
      },
    })
  }

  const onOpenTab = async () => {
    if (currentId === id) {
      return
    }

    await navigate({
      to: '/guides/$id',
      params: {
        id,
      },
      search: {
        step: getStepOr(profile, id, 0),
      },
    })
  }

  const onCloseTab = async () => {
    try {
      if (tabs.length === 1) {
        await navigate({
          to: '/guides',
          search: {
            path: '',
          },
        })

        return
      }

      debug(`Closing tab: ${id} at position ${positionInList} - current: ${currentId}`)

      if (currentId === id && positionInList !== -1) {
        const nextGuide = tabs.filter((tab) => tab !== id)[clamp(positionInList - 1, 0, tabs.length - 1)]

        debug(`Navigating to next guide: ${nextGuide}`)

        await navigate({
          to: '/guides/$id',
          params: {
            id: nextGuide,
          },
          search: {
            step: getStepOr(profile, nextGuide, 0),
          },
        })
      }
    } finally {
      removeTab(id)
      registerGuideClose.mutate({ guideId: id, profileId: profile.id })
    }
  }

  const onCloseTabsToRight = async () => {
    if (!hasTabsToRight) return

    const toRemove = tabs.slice(positionInList + 1)
    const remaining = tabs.slice(0, positionInList + 1)

    setTabs(remaining)

    if (!remaining.includes(currentId)) {
      await navigate({
        to: '/guides/$id',
        params: { id },
        search: { step: getStepOr(profile, id, 0) },
      })
    }

    for (const tabId of toRemove) {
      registerGuideClose.mutate({ guideId: tabId, profileId: profile.id })
    }
  }

  const onCloseOtherTabs = async () => {
    if (!hasOtherTabs) return

    const toRemove = tabs.filter((tab) => tab !== id)

    setTabs([id])

    if (currentId !== id) {
      await navigate({
        to: '/guides/$id',
        params: { id },
        search: { step: getStepOr(profile, id, 0) },
      })
    }

    for (const tabId of toRemove) {
      registerGuideClose.mutate({ guideId: tabId, profileId: profile.id })
    }
  }

  const onCloseAllTabs = async () => {
    const toRemove = [...tabs]

    setTabs([])

    await navigate({
      to: '/guides',
      search: { path: '' },
    })

    for (const tabId of toRemove) {
      registerGuideClose.mutate({ guideId: tabId, profileId: profile.id })
    }
  }

  return (
    <TooltipProvider delayDuration={400}>
      <Tooltip>
        <ContextMenu>
          <TooltipTrigger asChild>
            <ContextMenuTrigger asChild>
              <div
                className={cn(
                  'relative flex shrink-0 cursor-grab pb-1 active:cursor-grabbing',
                  isDragging && 'opacity-60',
                )}
                data-guide-id={id}
                data-guide-tab="true"
                onPointerDown={(evt) => onTabPointerDown(evt, id)}
              >
                {dropPosition && (
                  <span
                    className={cn(
                      'pointer-events-none absolute top-0 bottom-1 z-10 w-0.5 rounded-full bg-primary',
                      dropPosition === 'before' ? 'left-0' : 'right-0',
                    )}
                  />
                )}
                <TabsTrigger
                  asChild
                  className={cn(
                    'group/tab relative m-0 flex max-w-40 items-center gap-1.5 overflow-hidden whitespace-nowrap rounded-lg bg-surface-inset font-medium text-foreground/75 text-xs transition-none data-[state=active]:bg-surface-page data-[state=active]:text-foreground data-[state=active]:shadow-sm data-[state=inactive]:hover:bg-surface-page/50',
                    !isSmallGuide && 'xs:text-sm lg:max-w-62',
                  )}
                  onClick={async (evt) => {
                    evt.preventDefault()

                    await onOpenTab()
                  }}
                  onMouseDown={(evt) => {
                    if (evt.button === 1) {
                      evt.preventDefault()
                      evt.stopPropagation()
                      onCloseTab()
                    }
                  }}
                  value={id.toString()}
                >
                  <div draggable={false}>
                    <GuideNodeImage guide={guide} />
                    <span
                      className={cn('-translate-y-0.5 hidden truncate', !isSmallGuide && 'xs:inline')}
                      draggable={false}
                    >
                      {guide.name}
                    </span>
                    {/* Progress bar */}
                    <div className="absolute bottom-0 left-0 h-0.5 w-full">
                      <div className="size-full bg-black/20">
                        <div
                          className="h-full rounded-b-xl bg-success"
                          style={{ width: `${Math.min(progressPercent, 100)}%` }}
                        />
                      </div>
                    </div>
                    <button
                      className={cn(
                        'group/close invisible absolute top-0 right-0 z-0 cursor-pointer bg-surface-page text-primary-foreground transition-none group-hover/tab:visible',
                        !isSmallGuide &&
                          'xs:mask-gradient-to-left xs:top-0 xs:bottom-0.5 xs:flex xs:h-[calc(100%-0.125rem)] xs:w-6 xs:items-center xs:justify-end xs:pr-1.5',
                      )}
                      data-no-tab-drag="true"
                      draggable={false}
                      onClick={async (evt) => {
                        evt.preventDefault()
                        evt.stopPropagation()

                        await onCloseTab()
                      }}
                    >
                      <XIcon
                        className={cn(
                          'size-3 rounded-full p-0.5',
                          !isSmallGuide && 'xs:group-hover/close:bg-surface-inset',
                        )}
                      />
                    </button>
                  </div>
                </TabsTrigger>
              </div>
            </ContextMenuTrigger>
          </TooltipTrigger>
          <ContextMenuContent>
            <ContextMenuItem onSelect={onCloseTab}>
              <Trans>Fermer</Trans>
            </ContextMenuItem>
            <ContextMenuItem disabled={!hasTabsToRight} onSelect={onCloseTabsToRight}>
              <Trans>Fermer à droite</Trans>
            </ContextMenuItem>
            <ContextMenuItem disabled={!hasOtherTabs} onSelect={onCloseOtherTabs}>
              <Trans>Fermer les autres</Trans>
            </ContextMenuItem>
            <ContextMenuSeparator />
            <ContextMenuItem onSelect={onCloseAllTabs}>
              <Trans>Tout fermer</Trans>
            </ContextMenuItem>
          </ContextMenuContent>
        </ContextMenu>
        <TooltipContent className="xl:hidden" side="bottom">
          {guide.name}
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  )
}
