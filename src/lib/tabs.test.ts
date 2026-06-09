import { describe, expect, test } from 'vitest'

import { reorderOpenedGuides } from './tabs.ts'

describe('reorderOpenedGuides', () => {
  test('moves a guide before another guide', () => {
    expect(reorderOpenedGuides([1, 2, 3, 4], 4, 2, 'before')).toEqual([1, 4, 2, 3])
  })

  test('moves a guide after another guide', () => {
    expect(reorderOpenedGuides([1, 2, 3, 4], 1, 3, 'after')).toEqual([2, 3, 1, 4])
  })

  test('returns the original reference when the guide is already in the requested position', () => {
    const tabs = [1, 2, 3]

    expect(reorderOpenedGuides(tabs, 2, 1, 'after')).toBe(tabs)
  })

  test('returns the original reference when a guide is missing', () => {
    const tabs = [1, 2, 3]

    expect(reorderOpenedGuides(tabs, 4, 2, 'before')).toBe(tabs)
    expect(reorderOpenedGuides(tabs, 2, 4, 'after')).toBe(tabs)
  })

  test('returns the original reference for a single-tab list', () => {
    const tabs = [1]

    expect(reorderOpenedGuides(tabs, 1, 1, 'after')).toBe(tabs)
  })

  test('returns the original reference when the dragged guide is the target guide', () => {
    const tabs = [1, 2, 3]

    expect(reorderOpenedGuides(tabs, 2, 2, 'before')).toBe(tabs)
  })
})
