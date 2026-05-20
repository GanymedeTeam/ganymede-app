import { useSuspenseQuery } from '@tanstack/react-query'
import { useNavigate } from '@tanstack/react-router'
import { debug } from '@tauri-apps/plugin-log'
import { XIcon } from 'lucide-react'
import { useEffect } from 'react'
import { GuideNodeImage } from '@/components/guide_node_image.tsx'
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

      const positionInList = tabs.findIndex((tab) => tab === id)

      debug(`Closing tab: ${id} at position ${positionInList} - current: ${currentId}`)

      if (currentId === id && positionInList !== -1) {
        const nextGuide = tabs.filter((tab) => tab !== id)[clamp(positionInList - 1, 0, tabs.length - 1)]

        debug(`Navigating to next guide: ${nextGuide}`)

        // go to previous tab if it exists
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

  return (
    <TooltipProvider delayDuration={400}>
      <Tooltip>
        <TooltipTrigger asChild>
          <div className="relative flex shrink-0 pb-1">
            <TabsTrigger
              asChild
              className={cn(
                'group/tab relative m-0 flex max-w-40 items-center gap-1.5 overflow-hidden whitespace-nowrap rounded-lg bg-surface-inset font-medium text-foreground/75 text-xs transition-none data-[state=active]:bg-surface-page data-[state=active]:text-foreground data-[state=active]:shadow-sm data-[state=inactive]:hover:bg-surface-page/50',
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
                <span className={cn('-translate-y-0.5 hidden truncate', !isSmallGuide && 'xs:inline')}>{guide.name}</span>
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
                      'xs:mask-gradient-to-left xs:top-0 xs:bottom-0.5 xs:flex xs:h-[calc(100%-0.125rem)] xs:w-12 xs:items-center xs:justify-end xs:pr-2',
                  )}
                  onClick={async (evt) => {
                    evt.stopPropagation()

                    await onCloseTab()
                  }}
                >
                  <XIcon
                    className={cn('size-4 rounded-full p-0.5', !isSmallGuide && 'xs:group-hover/close:bg-surface-inset')}
                  />
                </button>
              </div>
            </TabsTrigger>
          </div>
        </TooltipTrigger>
        <TooltipContent className="xl:hidden" side="bottom">
          {guide.name}
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  )
}
