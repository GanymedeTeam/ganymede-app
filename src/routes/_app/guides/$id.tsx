import { Trans } from '@lingui/react/macro'
import { useSuspenseQuery } from '@tanstack/react-query'
import { createFileRoute, Link, redirect } from '@tanstack/react-router'
import { debug } from '@tauri-apps/plugin-log'
import { PlusIcon } from 'lucide-react'
import { type PointerEvent as ReactPointerEvent, useCallback, useEffect, useRef, useState } from 'react'
import { z } from 'zod'

import { PageContent } from '@/components/page_content.tsx'
import { PageTitle, PageTitleText } from '@/components/page_title.tsx'
import { Button } from '@/components/ui/button.tsx'
import { Tabs, TabsContent, TabsList } from '@/components/ui/tabs.tsx'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip.tsx'
import { useProfile } from '@/hooks/use_profile.ts'
import { useTabs } from '@/hooks/use_tabs.ts'
import { registerGuideOpen, setRecentGuides } from '@/ipc/guides.ts'
import { getGuideById, getStepClamped } from '@/lib/guide.ts'
import { getProfile } from '@/lib/profile.ts'
import { getProgress } from '@/lib/progress.ts'
import { OpenedGuideDropPosition, reorderOpenedGuides } from '@/lib/tabs.ts'
import { confQuery } from '@/queries/conf.query.ts'
import { guidesQuery } from '@/queries/guides.query.ts'
import { stepNotesQuery } from '@/queries/step_notes.query.ts'

import { GuidePage } from './-$id/guide_page.tsx'
import { GuideTabsTrigger } from './-$id/guide_tabs_trigger.tsx'

const GUIDE_TAB_DRAG_THRESHOLD_PX = 6
const GUIDE_TAB_DROP_VERTICAL_PADDING_PX = 24

const ParamsZod = z.object({
  id: z.coerce.number(),
})

const SearchZod = z.object({
  step: z.coerce.number(),
})

export const Route = createFileRoute('/_app/guides/$id')({
  component: GuideIdPage,
  validateSearch: SearchZod.parse,
  params: {
    parse: ParamsZod.parse,
    stringify: (params) => ({ id: params.id.toString() }),
  },
  pendingComponent: Pending,
  beforeLoad: async ({ context: { queryClient }, params, search: { step } }) => {
    const [guides, conf] = await Promise.all([
      queryClient.ensureQueryData(guidesQuery()),
      queryClient.ensureQueryData(confQuery),
      queryClient.ensureQueryData(stepNotesQuery),
    ])

    const guideById = getGuideById(guides, params.id)

    if (!guideById) {
      throw redirect({
        to: '/guides',
        search: {
          path: '',
        },
      })
    }

    const currentStep = step + 1
    const totalSteps = guideById.steps.length

    if (currentStep > totalSteps) {
      throw redirect({
        to: '/guides/$id',
        params: {
          id: guideById.id,
        },
        search: {
          step: totalSteps - 1,
        },
        replace: true,
      })
    }

    const { addOrReplaceTab } = useTabs.getState()

    addOrReplaceTab(guideById.id)

    const profile = getProfile(conf)
    const registerResult = await registerGuideOpen(guideById.id, profile.id)

    if (registerResult.isErr()) {
      await debug(`Error registering guide open: ${registerResult.error.message}`)
    }
  },
})

function Pending() {
  return (
    <PageContent key="guide">
      <PageTitle>
        <div className="flex w-full items-center gap-2" data-slot="page-title-content">
          <PageTitleText></PageTitleText>
        </div>
      </PageTitle>
    </PageContent>
  )
}

function GuideIdPage() {
  const params = Route.useParams()
  const search = Route.useSearch()
  const tabs = useTabs((s) => s.tabs)
  const setTabs = useTabs((s) => s.setTabs)
  const navigate = Route.useNavigate()
  const profile = useProfile()
  const guides = useSuspenseQuery(guidesQuery())
  const tabsListRef = useRef<HTMLDivElement | null>(null)
  const pendingDragRef = useRef<{ guideId: number; pointerId: number; startX: number; startY: number } | null>(null)
  const preventTabClickTimeoutRef = useRef<number | null>(null)
  const preventTabClickRef = useRef(false)
  const [draggedTabId, setDraggedTabId] = useState<number | null>(null)
  const [dropTarget, setDropTarget] = useState<{ id: number; position: OpenedGuideDropPosition } | null>(null)
  const shouldPreventTabClick = useCallback(() => preventTabClickRef.current, [])

  const persistTabsOrder = useCallback(
    async (nextTabs: number[]) => {
      const result = await setRecentGuides(profile.id, nextTabs)

      if (result.isErr()) {
        await debug(`Error saving guides tabs order: ${result.error.message}`)
      }
    },
    [profile.id],
  )

  const releaseTabClickPrevention = useCallback(() => {
    if (preventTabClickTimeoutRef.current !== null) {
      window.clearTimeout(preventTabClickTimeoutRef.current)
    }

    preventTabClickTimeoutRef.current = window.setTimeout(() => {
      preventTabClickRef.current = false
      preventTabClickTimeoutRef.current = null
    }, 0)
  }, [])

  const stopDragging = useCallback(
    (shouldPreventClick: boolean) => {
      pendingDragRef.current = null
      setDraggedTabId(null)
      setDropTarget(null)
      document.body.style.removeProperty('cursor')
      document.body.style.removeProperty('user-select')

      if (shouldPreventClick) {
        preventTabClickRef.current = true
        releaseTabClickPrevention()
        return
      }

      preventTabClickRef.current = false
    },
    [releaseTabClickPrevention],
  )

  const getDropTargetFromPointer = useCallback((clientX: number, clientY: number, guideId: number) => {
    const tabsList = tabsListRef.current

    if (!tabsList) {
      return null
    }

    const tabsListRect = tabsList.getBoundingClientRect()

    if (
      clientY < tabsListRect.top - GUIDE_TAB_DROP_VERTICAL_PADDING_PX ||
      clientY > tabsListRect.bottom + GUIDE_TAB_DROP_VERTICAL_PADDING_PX
    ) {
      return null
    }

    const otherTabs = Array.from(tabsList.querySelectorAll<HTMLElement>('[data-guide-tab="true"]'))
      .map((tab) => {
        const tabId = Number(tab.dataset.guideId)
        const tabRect = tab.getBoundingClientRect()

        return {
          id: tabId,
          centerX: tabRect.left + tabRect.width / 2,
        }
      })
      .filter((tab) => !Number.isNaN(tab.id) && tab.id !== guideId)

    if (otherTabs.length === 0) {
      return null
    }

    const firstTabAfterPointer = otherTabs.find((tab) => clientX < tab.centerX)

    if (firstTabAfterPointer) {
      return {
        id: firstTabAfterPointer.id,
        position: 'before' as const,
      }
    }

    const lastTab = otherTabs.at(-1)

    if (!lastTab) {
      return null
    }

    return {
      id: lastTab.id,
      position: 'after' as const,
    }
  }, [])

  const onTabPointerDown = useCallback((evt: ReactPointerEvent<HTMLDivElement>, guideId: number) => {
    if (evt.button !== 0) {
      return
    }

    if ((evt.target as HTMLElement).closest('[data-no-tab-drag="true"]')) {
      return
    }

    pendingDragRef.current = {
      guideId,
      pointerId: evt.pointerId,
      startX: evt.clientX,
      startY: evt.clientY,
    }
  }, [])

  useEffect(() => {
    const handlePointerMove = (evt: PointerEvent) => {
      const pendingDrag = pendingDragRef.current

      if (!pendingDrag || evt.pointerId !== pendingDrag.pointerId) {
        return
      }

      if (draggedTabId === null) {
        const dragDistance = Math.hypot(evt.clientX - pendingDrag.startX, evt.clientY - pendingDrag.startY)

        if (dragDistance < GUIDE_TAB_DRAG_THRESHOLD_PX) {
          return
        }

        setDraggedTabId(pendingDrag.guideId)
        document.body.style.cursor = 'grabbing'
        document.body.style.userSelect = 'none'
      }

      const nextDropTarget = getDropTargetFromPointer(evt.clientX, evt.clientY, pendingDrag.guideId)

      setDropTarget((current) => {
        if (current?.id === nextDropTarget?.id && current?.position === nextDropTarget?.position) {
          return current
        }

        return nextDropTarget
      })
    }

    const handlePointerUp = (evt: PointerEvent) => {
      const pendingDrag = pendingDragRef.current

      if (!pendingDrag || evt.pointerId !== pendingDrag.pointerId) {
        return
      }

      const wasDragging = draggedTabId !== null
      const nextDropTarget = wasDragging
        ? getDropTargetFromPointer(evt.clientX, evt.clientY, pendingDrag.guideId)
        : null
      const nextTabs =
        wasDragging && nextDropTarget
          ? reorderOpenedGuides(tabs, pendingDrag.guideId, nextDropTarget.id, nextDropTarget.position)
          : tabs

      stopDragging(wasDragging)

      if (nextTabs === tabs) {
        return
      }

      setTabs(nextTabs)
      void persistTabsOrder(nextTabs)
    }

    const handlePointerCancel = (evt: PointerEvent) => {
      const pendingDrag = pendingDragRef.current

      if (!pendingDrag || evt.pointerId !== pendingDrag.pointerId) {
        return
      }

      stopDragging(draggedTabId !== null)
    }

    window.addEventListener('pointermove', handlePointerMove)
    window.addEventListener('pointerup', handlePointerUp)
    window.addEventListener('pointercancel', handlePointerCancel)

    return () => {
      window.removeEventListener('pointermove', handlePointerMove)
      window.removeEventListener('pointerup', handlePointerUp)
      window.removeEventListener('pointercancel', handlePointerCancel)
      document.body.style.removeProperty('cursor')
      document.body.style.removeProperty('user-select')
    }
  }, [draggedTabId, getDropTargetFromPointer, persistTabsOrder, setTabs, stopDragging, tabs])

  useEffect(() => {
    return () => {
      if (preventTabClickTimeoutRef.current !== null) {
        window.clearTimeout(preventTabClickTimeoutRef.current)
      }
    }
  }, [])

  return (
    <PageContent key="guide">
      <Tabs
        onValueChange={(newTab) => {
          navigate({
            to: '/guides/$id',
            params: {
              id: Number(newTab),
            },
            search: {
              step: getProgress(profile, Number(newTab))?.currentStep ?? 0,
            },
          })
        }}
        value={params.id.toString()}
      >
        <div className="flex w-full bg-surface-card text-primary-foreground-800">
          <TabsList
            className="group scrollbar-hide h-10 flex-1 overflow-x-auto overflow-y-hidden pl-0"
            data-multiple={tabs.length > 1 ? 'true' : 'false'}
            onWheel={(e) => {
              if (e.deltaY !== 0) {
                e.currentTarget.scrollLeft += e.deltaY
              }
            }}
            ref={tabsListRef}
          >
            {tabs.map((guideId) => (
              <GuideTabsTrigger
                currentId={params.id}
                dropPosition={dropTarget?.id === guideId ? dropTarget.position : null}
                id={guideId}
                isDragging={draggedTabId === guideId}
                key={guideId}
                onTabPointerDown={onTabPointerDown}
                shouldPreventTabClick={shouldPreventTabClick}
              />
            ))}
          </TabsList>

          <div className="flex items-center gap-1 px-3">
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button asChild className="min-h-6 min-w-6 shrink-0 self-center" size="icon" variant="secondary">
                    <Link
                      draggable={false}
                      search={{
                        path: '',
                        from: params.id,
                      }}
                      to="/guides"
                    >
                      <PlusIcon />
                    </Link>
                  </Button>
                </TooltipTrigger>
                <TooltipContent side="bottom">
                  <Trans>Ouvrir un guide</Trans>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>
        </div>
        {tabs.map((guide) => (
          <TabsContent key={`guide-${guide}`} value={guide.toString()}>
            <GuidePage id={guide} stepIndex={getStepClamped(guides.data, params.id, search.step)} />
          </TabsContent>
        ))}
      </Tabs>
    </PageContent>
  )
}
