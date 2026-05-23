import { useQuery } from '@tanstack/react-query'
import { error } from '@tauri-apps/plugin-log'
import { useEffect, useRef } from 'react'
import { type InteractiveRegion } from '@/ipc/bindings.ts'
import { isInteractiveOverlaySupported, setInteractiveRegions } from '@/ipc/overlay.ts'
import {
  areInteractiveRegionsEqual,
  collectInteractiveRegions,
  OVERLAY_INTERACTIVE_SELECTOR,
} from '@/lib/overlay_regions.ts'
import { confQuery } from '@/queries/conf.query.ts'

const SYNC_THROTTLE_MS = 100

function hasInteractiveCandidate(node: Node) {
  return (
    node instanceof HTMLElement &&
    (node.matches(OVERLAY_INTERACTIVE_SELECTOR) || node.querySelector(OVERLAY_INTERACTIVE_SELECTOR) !== null)
  )
}

function shouldSyncForMutation(mutation: MutationRecord) {
  if (mutation.type === 'attributes') {
    return mutation.target instanceof HTMLElement
  }

  return (
    hasInteractiveCandidate(mutation.target) ||
    [...mutation.addedNodes].some(hasInteractiveCandidate) ||
    [...mutation.removedNodes].some(hasInteractiveCandidate)
  )
}

export function useOverlaySync() {
  const conf = useQuery(confQuery)
  const hasConf = conf.data !== undefined
  const overlayMode = conf.data?.overlayMode ?? false
  const supportsInteractiveOverlay = isInteractiveOverlaySupported()
  const lastSyncedRegions = useRef<InteractiveRegion[] | null>(null)

  useEffect(() => {
    if (!supportsInteractiveOverlay || !hasConf) {
      return
    }

    function syncRegions(regions: InteractiveRegion[]) {
      if (areInteractiveRegionsEqual(lastSyncedRegions.current, regions)) {
        return
      }

      setInteractiveRegions(regions).then((result) => {
        if (result.isErr()) {
          error(`Failed to sync overlay regions: ${String(result.error.cause)}`)
          return
        }

        lastSyncedRegions.current = regions
      })
    }

    if (!overlayMode) {
      syncRegions([])

      return
    }

    let frameId = 0
    let timeoutId = 0
    let lastSyncAt = 0
    let disposed = false
    const mutationObserver = new MutationObserver((mutations) => {
      if (mutations.some(shouldSyncForMutation)) {
        scheduleSync()
      }
    })
    const resizeObserver = new ResizeObserver(scheduleSync)
    const scrollListenerOptions = { capture: true, passive: true }

    function syncNow() {
      frameId = 0
      lastSyncAt = Date.now()

      syncRegions(collectInteractiveRegions())
    }

    function requestSyncFrame() {
      if (!disposed && frameId === 0) {
        frameId = window.requestAnimationFrame(syncNow)
      }
    }

    function scheduleSync() {
      if (disposed || frameId !== 0 || timeoutId !== 0) {
        return
      }

      const elapsedSinceLastSync = Date.now() - lastSyncAt
      const delay = Math.max(0, SYNC_THROTTLE_MS - elapsedSinceLastSync)

      if (delay === 0) {
        requestSyncFrame()
        return
      }

      timeoutId = window.setTimeout(() => {
        timeoutId = 0
        requestSyncFrame()
      }, delay)
    }

    mutationObserver.observe(document.body, {
      subtree: true,
      childList: true,
      attributes: true,
      attributeFilter: [
        'aria-hidden',
        'class',
        'data-disabled',
        'data-overlay-interactive',
        'data-radix-popper-content-wrapper',
        'data-sonner-toaster',
        'data-state',
        'disabled',
        'hidden',
        'href',
        'role',
        'style',
        'type',
      ],
    })
    resizeObserver.observe(document.body)
    window.addEventListener('resize', scheduleSync)
    window.addEventListener('scroll', scheduleSync, scrollListenerOptions)

    scheduleSync()

    return () => {
      disposed = true

      if (frameId !== 0) {
        window.cancelAnimationFrame(frameId)
      }

      if (timeoutId !== 0) {
        window.clearTimeout(timeoutId)
      }

      mutationObserver.disconnect()
      resizeObserver.disconnect()
      window.removeEventListener('resize', scheduleSync)
      window.removeEventListener('scroll', scheduleSync, scrollListenerOptions)
    }
  }, [hasConf, overlayMode, supportsInteractiveOverlay])
}
