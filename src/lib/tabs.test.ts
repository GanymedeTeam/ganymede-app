import assert from 'node:assert/strict'
import { describe, test } from 'node:test'
import { reorderOpenedGuides } from './tabs.ts'

describe('reorderOpenedGuides', () => {
  test('moves a guide before another guide', () => {
    assert.deepEqual(reorderOpenedGuides([1, 2, 3, 4], 4, 2, 'before'), [1, 4, 2, 3])
  })

  test('moves a guide after another guide', () => {
    assert.deepEqual(reorderOpenedGuides([1, 2, 3, 4], 1, 3, 'after'), [2, 3, 1, 4])
  })

  test('returns the original reference when the guide is already in the requested position', () => {
    const tabs = [1, 2, 3]

    assert.equal(reorderOpenedGuides(tabs, 2, 1, 'after'), tabs)
  })

  test('returns the original reference when a guide is missing', () => {
    const tabs = [1, 2, 3]

    assert.equal(reorderOpenedGuides(tabs, 4, 2, 'before'), tabs)
    assert.equal(reorderOpenedGuides(tabs, 2, 4, 'after'), tabs)
  })

  test('returns the original reference for a single-tab list', () => {
    const tabs = [1]

    assert.equal(reorderOpenedGuides(tabs, 1, 1, 'after'), tabs)
  })

  test('returns the original reference when the dragged guide is the target guide', () => {
    const tabs = [1, 2, 3]

    assert.equal(reorderOpenedGuides(tabs, 2, 2, 'before'), tabs)
  })
})
