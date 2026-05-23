import { t } from '@lingui/core/macro'
import { Trans } from '@lingui/react/macro'
import { useSuspenseQuery } from '@tanstack/react-query'
import { createFileRoute, Link, redirect } from '@tanstack/react-router'
import { debug } from '@tauri-apps/plugin-log'
import { PlusIcon } from 'lucide-react'
import { type PointerEvent as ReactPointerEvent, useCallback, useEffect, useRef, useState } from 'react'
import { toast } from 'sonner'
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
const GUIDE_TAB_AUTO_SCROLL_EDGE_PX = 36
const GUIDE_TAB_AUTO_SCROLL_MAX_DELTA_PX = 14
const GUIDE_TAB_DROP_VERTICAL_PADDING_PX = 24
const GUIDE_TAB_PREVENT_CLICK_TIMEOUT_MS = 500

type PendingGuideTabDrag = {
  guideId: number
  pointerId: number
  startX: number
  startY: number
  capturedElement: HTMLDivElement | null
}

type PendingTabsPersistence = {
  nextTabs: number[]
}

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

function areTabsEqual(left: number[], right: number[]) {
  return left.length === right.length && left.every((tab, index) => tab === right[index])
}

function getTabsAutoScrollDelta(clientX: number, tabsListRect: DOMRect) {
  const leftEdgeDistance = clientX - tabsListRect.left
  const rightEdgeDistance = tabsListRect.right - clientX

  if (leftEdgeDistance < GUIDE_TAB_AUTO_SCROLL_EDGE_PX) {
    return -getTabsAutoScrollSpeed(GUIDE_TAB_AUTO_SCROLL_EDGE_PX - leftEdgeDistance)
  }

  if (rightEdgeDistance < GUIDE_TAB_AUTO_SCROLL_EDGE_PX) {
    return getTabsAutoScrollSpeed(GUIDE_TAB_AUTO_SCROLL_EDGE_PX - rightEdgeDistance)
  }

  return 0
}

function getTabsAutoScrollSpeed(edgeOverflow: number) {
  const ratio = Math.min(Math.max(edgeOverflow / GUIDE_TAB_AUTO_SCROLL_EDGE_PX, 0), 1)

  return Math.ceil(ratio * GUIDE_TAB_AUTO_SCROLL_MAX_DELTA_PX)
}

function releaseGuideTabPointerCapture(pendingDrag: PendingGuideTabDrag | null) {
  if (pendingDrag?.capturedElement?.hasPointerCapture(pendingDrag.pointerId)) {
    pendingDrag.capturedElement.releasePointerCapture(pendingDrag.pointerId)
  }
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
  const pendingDragRef = useRef<PendingGuideTabDrag | null>(null)
  const draggedTabIdRef = useRef<number | null>(null)
  const tabsRef = useRef(tabs)
  const lastPersistedTabsRef = useRef(tabs)
  const autoScrollFrameRef = useRef<number | null>(null)
  const autoScrollPointerRef = useRef<{ clientX: number; clientY: number } | null>(null)
  const releasePreventNextClickRef = useRef<(() => void) | null>(null)
  const tabsPersistenceRef = useRef<{
    isSaving: boolean
    pending: PendingTabsPersistence | null
  }>({ isSaving: false, pending: null })
  const [draggedTabId, setDraggedTabId] = useState<number | null>(null)
  const [dropTarget, setDropTarget] = useState<{ id: number; position: OpenedGuideDropPosition } | null>(null)

  useEffect(() => {
    tabsRef.current = tabs

    if (!tabsPersistenceRef.current.isSaving && !tabsPersistenceRef.current.pending) {
      lastPersistedTabsRef.current = tabs
    }
  }, [tabs])

  const preventNextClick = useCallback(() => {
    releasePreventNextClickRef.current?.()
    let timeoutId: number | null = null

    const handleClick = (evt: MouseEvent) => {
      evt.preventDefault()
      evt.stopPropagation()
      evt.stopImmediatePropagation()
      releasePreventNextClickRef.current?.()
    }

    document.addEventListener('click', handleClick, { capture: true, once: true })
    timeoutId = window.setTimeout(() => {
      releasePreventNextClickRef.current?.()
    }, GUIDE_TAB_PREVENT_CLICK_TIMEOUT_MS)

    releasePreventNextClickRef.current = () => {
      document.removeEventListener('click', handleClick, true)
      if (timeoutId !== null) {
        window.clearTimeout(timeoutId)
      }
      releasePreventNextClickRef.current = null
    }
  }, [])

  const persistLatestTabsOrder = useCallback(async () => {
    const state = tabsPersistenceRef.current

    if (state.isSaving) {
      return
    }

    state.isSaving = true

    while (state.pending) {
      const { nextTabs } = state.pending
      state.pending = null
      const result = await setRecentGuides(profile.id, nextTabs)
      const tabsChangedWhileSaving = !areTabsEqual(tabsRef.current, nextTabs)

      if (result.isErr()) {
        await debug(`Error saving guides tabs order: ${result.error.message}`)

        if (!state.pending && tabsChangedWhileSaving) {
          state.pending = { nextTabs: tabsRef.current }
        } else if (!state.pending) {
          const rollbackTabs = lastPersistedTabsRef.current
          tabsRef.current = rollbackTabs
          setTabs(rollbackTabs)
          toast.error(t`Impossible d'enregistrer l'ordre des onglets. L'ordre précédent a été restauré.`)
        }
      } else if (!state.pending && tabsChangedWhileSaving) {
        state.pending = { nextTabs: tabsRef.current }
      } else {
        lastPersistedTabsRef.current = nextTabs
      }
    }

    state.isSaving = false
  }, [profile.id, setTabs])

  const persistTabsOrder = useCallback(
    (nextTabs: number[]) => {
      tabsPersistenceRef.current.pending = { nextTabs }
      void persistLatestTabsOrder()
    },
    [persistLatestTabsOrder],
  )

  const stopDragging = useCallback(
    (shouldPreventClick: boolean) => {
      const pendingDrag = pendingDragRef.current

      releaseGuideTabPointerCapture(pendingDrag)
      pendingDragRef.current = null
      draggedTabIdRef.current = null
      autoScrollPointerRef.current = null

      if (autoScrollFrameRef.current !== null) {
        window.cancelAnimationFrame(autoScrollFrameRef.current)
        autoScrollFrameRef.current = null
      }

      setDraggedTabId(null)
      setDropTarget(null)
      document.body.style.removeProperty('cursor')
      document.body.style.removeProperty('user-select')

      if (shouldPreventClick) {
        preventNextClick()
      }
    },
    [preventNextClick],
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

  const updateDropTargetFromPointer = useCallback(
    (clientX: number, clientY: number, guideId: number) => {
      const nextDropTarget = getDropTargetFromPointer(clientX, clientY, guideId)

      setDropTarget((current) => {
        if (current?.id === nextDropTarget?.id && current?.position === nextDropTarget?.position) {
          return current
        }

        return nextDropTarget
      })
    },
    [getDropTargetFromPointer],
  )

  const scheduleTabAutoScroll = useCallback(() => {
    if (autoScrollFrameRef.current !== null) {
      return
    }

    autoScrollFrameRef.current = window.requestAnimationFrame(() => {
      autoScrollFrameRef.current = null

      const tabsList = tabsListRef.current
      const pointer = autoScrollPointerRef.current
      const pendingDrag = pendingDragRef.current

      if (!tabsList || !pointer || !pendingDrag || draggedTabIdRef.current === null) {
        return
      }

      const tabsListRect = tabsList.getBoundingClientRect()

      if (
        pointer.clientY < tabsListRect.top - GUIDE_TAB_DROP_VERTICAL_PADDING_PX ||
        pointer.clientY > tabsListRect.bottom + GUIDE_TAB_DROP_VERTICAL_PADDING_PX
      ) {
        return
      }

      const scrollDelta = getTabsAutoScrollDelta(pointer.clientX, tabsListRect)

      if (scrollDelta === 0) {
        return
      }

      const previousScrollLeft = tabsList.scrollLeft
      tabsList.scrollLeft += scrollDelta

      if (tabsList.scrollLeft === previousScrollLeft) {
        return
      }

      updateDropTargetFromPointer(pointer.clientX, pointer.clientY, pendingDrag.guideId)
      scheduleTabAutoScroll()
    })
  }, [updateDropTargetFromPointer])

  const onTabPointerDown = useCallback((evt: ReactPointerEvent<HTMLDivElement>, guideId: number) => {
    if (evt.button !== 0) {
      return
    }

    if ((evt.target as HTMLElement).closest('[data-no-tab-drag="true"]')) {
      return
    }

    releaseGuideTabPointerCapture(pendingDragRef.current)
    evt.currentTarget.setPointerCapture(evt.pointerId)

    pendingDragRef.current = {
      guideId,
      pointerId: evt.pointerId,
      startX: evt.clientX,
      startY: evt.clientY,
      capturedElement: evt.currentTarget,
    }
  }, [])

  useEffect(() => {
    const handlePointerMove = (evt: PointerEvent) => {
      const pendingDrag = pendingDragRef.current

      if (!pendingDrag || evt.pointerId !== pendingDrag.pointerId) {
        return
      }

      if (draggedTabIdRef.current === null) {
        const dragDistance = Math.hypot(evt.clientX - pendingDrag.startX, evt.clientY - pendingDrag.startY)

        if (dragDistance < GUIDE_TAB_DRAG_THRESHOLD_PX) {
          return
        }

        draggedTabIdRef.current = pendingDrag.guideId
        setDraggedTabId(pendingDrag.guideId)
        document.body.style.cursor = 'grabbing'
        document.body.style.userSelect = 'none'
      }

      autoScrollPointerRef.current = { clientX: evt.clientX, clientY: evt.clientY }
      updateDropTargetFromPointer(evt.clientX, evt.clientY, pendingDrag.guideId)
      scheduleTabAutoScroll()
    }

    const handlePointerUp = (evt: PointerEvent) => {
      const pendingDrag = pendingDragRef.current

      if (!pendingDrag || evt.pointerId !== pendingDrag.pointerId) {
        return
      }

      const wasDragging = draggedTabIdRef.current !== null
      const nextDropTarget = wasDragging
        ? getDropTargetFromPointer(evt.clientX, evt.clientY, pendingDrag.guideId)
        : null
      const currentTabs = tabsRef.current
      const nextTabs =
        wasDragging && nextDropTarget
          ? reorderOpenedGuides(currentTabs, pendingDrag.guideId, nextDropTarget.id, nextDropTarget.position)
          : currentTabs

      stopDragging(wasDragging)

      if (nextTabs === currentTabs) {
        return
      }

      tabsRef.current = nextTabs
      setTabs(nextTabs)
      persistTabsOrder(nextTabs)
    }

    const handlePointerCancel = (evt: PointerEvent) => {
      const pendingDrag = pendingDragRef.current

      if (!pendingDrag || evt.pointerId !== pendingDrag.pointerId) {
        return
      }

      stopDragging(false)
    }

    window.addEventListener('pointermove', handlePointerMove)
    window.addEventListener('pointerup', handlePointerUp)
    window.addEventListener('pointercancel', handlePointerCancel)

    return () => {
      window.removeEventListener('pointermove', handlePointerMove)
      window.removeEventListener('pointerup', handlePointerUp)
      window.removeEventListener('pointercancel', handlePointerCancel)
      if (autoScrollFrameRef.current !== null) {
        window.cancelAnimationFrame(autoScrollFrameRef.current)
        autoScrollFrameRef.current = null
      }
      releaseGuideTabPointerCapture(pendingDragRef.current)
      pendingDragRef.current = null
      draggedTabIdRef.current = null
      autoScrollPointerRef.current = null
      document.body.style.removeProperty('cursor')
      document.body.style.removeProperty('user-select')
    }
  }, [
    getDropTargetFromPointer,
    persistTabsOrder,
    scheduleTabAutoScroll,
    setTabs,
    stopDragging,
    updateDropTargetFromPointer,
  ])

  useEffect(() => {
    return () => {
      releasePreventNextClickRef.current?.()
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
