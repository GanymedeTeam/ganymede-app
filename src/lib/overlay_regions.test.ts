import { afterEach, describe, expect, it } from 'vitest'
import {
  areInteractiveRegionsEqual,
  collectInteractiveRegions,
  isVisible,
  toInteractiveRegion,
} from './overlay_regions.ts'

function setRect(element: HTMLElement, rect: DOMRect) {
  element.getBoundingClientRect = () => rect
}

afterEach(() => {
  document.body.replaceChildren()
  Object.defineProperty(window, 'devicePixelRatio', {
    configurable: true,
    value: 1,
  })
})

describe('overlay regions', () => {
  it('converts CSS pixels to physical pixels with DPR-aware padding', () => {
    Object.defineProperty(window, 'devicePixelRatio', {
      configurable: true,
      value: 2,
    })

    expect(toInteractiveRegion(new DOMRect(10, 20, 30, 40))).toEqual({
      x: 16,
      y: 36,
      width: 68,
      height: 88,
    })
  })

  it('treats elements hidden by a parent as invisible', () => {
    const parent = document.createElement('div')
    parent.style.display = 'none'
    const button = document.createElement('button')
    setRect(button, new DOMRect(0, 0, 10, 10))

    parent.append(button)
    document.body.append(parent)

    expect(isVisible(button)).toBe(false)
  })

  it('collects visible interactive elements only', () => {
    const button = document.createElement('button')
    setRect(button, new DOMRect(10, 20, 30, 40))

    const disabledButton = document.createElement('button')
    disabledButton.disabled = true
    setRect(disabledButton, new DOMRect(1, 1, 10, 10))

    const hiddenLink = document.createElement('a')
    hiddenLink.href = '#'
    hiddenLink.style.visibility = 'hidden'
    setRect(hiddenLink, new DOMRect(1, 1, 10, 10))

    document.body.append(button, disabledButton, hiddenLink)

    expect(collectInteractiveRegions()).toEqual([
      {
        x: 8,
        y: 18,
        width: 34,
        height: 44,
      },
    ])
  })

  it('collects ARIA tab triggers as interactive elements', () => {
    const tab = document.createElement('div')
    tab.role = 'tab'
    setRect(tab, new DOMRect(4, 8, 120, 24))

    document.body.append(tab)

    expect(collectInteractiveRegions()).toEqual([
      {
        x: 2,
        y: 6,
        width: 124,
        height: 28,
      },
    ])
  })

  it('ignores disabled ARIA interactive elements', () => {
    const tab = document.createElement('div')
    tab.role = 'tab'
    tab.setAttribute('aria-disabled', 'true')
    setRect(tab, new DOMRect(4, 8, 120, 24))

    document.body.append(tab)

    expect(collectInteractiveRegions()).toEqual([])
  })

  it('compares region payloads by value', () => {
    const regions = [{ x: 1, y: 2, width: 3, height: 4 }]

    expect(areInteractiveRegionsEqual(regions, [{ x: 1, y: 2, width: 3, height: 4 }])).toBe(true)
    expect(areInteractiveRegionsEqual(regions, [{ x: 1, y: 2, width: 3, height: 5 }])).toBe(false)
  })
})
