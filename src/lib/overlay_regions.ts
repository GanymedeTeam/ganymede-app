import { type InteractiveRegion } from '@/ipc/bindings.ts'

export const INTERACTIVE_REGION_PADDING = 2

export const OVERLAY_INTERACTIVE_SELECTOR = [
  '[data-overlay-interactive="true"]',
  'button:not([disabled])',
  'a[href]',
  'input:not([type="hidden"]):not([disabled])',
  'textarea:not([disabled])',
  'select:not([disabled])',
  '[role="button"]:not([aria-disabled="true"]):not([data-disabled])',
  '[role="checkbox"]:not([aria-disabled="true"]):not([data-disabled])',
  '[role="combobox"]:not([aria-disabled="true"]):not([data-disabled])',
  '[role="link"]:not([aria-disabled="true"]):not([data-disabled])',
  '[role="menuitem"]:not([aria-disabled="true"]):not([data-disabled])',
  '[role="option"]:not([aria-disabled="true"]):not([data-disabled])',
  '[role="radio"]:not([aria-disabled="true"]):not([data-disabled])',
  '[role="slider"]:not([aria-disabled="true"]):not([data-disabled])',
  '[role="switch"]:not([aria-disabled="true"]):not([data-disabled])',
  '[role="tab"]:not([aria-disabled="true"]):not([data-disabled])',
  '[role="textbox"]:not([aria-disabled="true"]):not([data-disabled])',
  '[data-radix-popper-content-wrapper]',
  '[data-sonner-toaster]',
].join(', ')

export function isVisible(element: HTMLElement, rect = element.getBoundingClientRect()) {
  if (rect.width <= 0 || rect.height <= 0) {
    return false
  }

  for (let current: HTMLElement | null = element; current !== null; current = current.parentElement) {
    const style = window.getComputedStyle(current)

    if (style.display === 'none' || style.visibility === 'hidden' || style.pointerEvents === 'none') {
      return false
    }
  }

  return true
}

export function toInteractiveRegion(rect: DOMRect): InteractiveRegion {
  const scale = window.devicePixelRatio || 1
  const left = Math.floor((rect.left - INTERACTIVE_REGION_PADDING) * scale)
  const top = Math.floor((rect.top - INTERACTIVE_REGION_PADDING) * scale)
  const right = Math.ceil((rect.right + INTERACTIVE_REGION_PADDING) * scale)
  const bottom = Math.ceil((rect.bottom + INTERACTIVE_REGION_PADDING) * scale)

  return {
    x: left,
    y: top,
    width: right - left,
    height: bottom - top,
  }
}

export function collectInteractiveRegions(root: ParentNode = document) {
  const elements = [...root.querySelectorAll<HTMLElement>(OVERLAY_INTERACTIVE_SELECTOR)]

  return elements.flatMap((element) => {
    const rect = element.getBoundingClientRect()

    return isVisible(element, rect) ? [toInteractiveRegion(rect)] : []
  })
}

export function areInteractiveRegionsEqual(previous: InteractiveRegion[] | null, next: InteractiveRegion[]) {
  if (previous?.length !== next.length) {
    return false
  }

  return previous.every((region, index) => {
    const nextRegion = next[index]

    return (
      region.x === nextRegion.x &&
      region.y === nextRegion.y &&
      region.width === nextRegion.width &&
      region.height === nextRegion.height
    )
  })
}
