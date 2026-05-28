import { Trans } from '@lingui/react/macro'
import { useSuspenseQuery } from '@tanstack/react-query'
import { useNavigate } from '@tanstack/react-router'
import { debug } from '@tauri-apps/plugin-log'
import { XIcon } from 'lucide-react'
import { useEffect } from 'react'

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
import { cn } from '@/lib/utils.ts'
import { useRegisterGuideClose } from '@/mutations/register_guide_close.mutation.ts'
import { confQuery } from '@/queries/conf.query.ts'

export function GuideTabsTrigger({ id, currentId }: { id: number; currentId: number }) {
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
              <div className="relative flex shrink-0 pb-1">
                <TabsTrigger
                  asChild
                  className={cn(
                    'group/tab relative m-0 flex max-w-40 items-center gap-1.5 overflow-hidden rounded-lg bg-surface-inset text-xs font-medium whitespace-nowrap text-foreground/75 transition-none data-[state=active]:bg-surface-page data-[state=active]:text-foreground data-[state=active]:shadow-sm data-[state=inactive]:hover:bg-surface-page/50',
                    !isSmallGuide && 'xs:text-sm lg:max-w-62',
                  )}
                  onMouseDown={(evt) => {
                    if (evt.button === 1) {
                      evt.preventDefault()
                      evt.stopPropagation()
                      onCloseTab()
                    }
                  }}
                  value={id.toString()}
                >
                  <div>
                    <GuideNodeImage guide={guide} />
                    <span className={cn('hidden -translate-y-0.5 truncate', !isSmallGuide && 'xs:inline')}>
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
                          'xs:top-0 xs:bottom-0.5 xs:flex xs:h-[calc(100%-0.125rem)] xs:w-6 xs:items-center xs:justify-end xs:pr-1.5 xs:mask-gradient-to-left',
                      )}
                      onClick={async (evt) => {
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
