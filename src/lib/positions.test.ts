import { describe, expect, test } from 'vitest'

import { getChainedCommand, getPositionCopyContent, parsePositions } from './positions.ts'

describe('parsePositions', () => {
  test('returns a single text token when there is no position', () => {
    expect(parsePositions('Aller voir le PNJ')).toEqual([{ type: 'text', value: 'Aller voir le PNJ' }])
  })

  test('parses a position surrounded by text', () => {
    expect(parsePositions('Aller en [-20,-58] - parler au PNJ')).toEqual([
      { type: 'text', value: 'Aller en ' },
      { type: 'position', position: { x: -20, y: -58 } },
      { type: 'text', value: ' - parler au PNJ' },
    ])
  })

  test('parses a zaap alone', () => {
    expect(parsePositions('Zaap [zaap:-20,40]')).toEqual([
      { type: 'text', value: 'Zaap ' },
      { type: 'position', zaap: { x: -20, y: 40 } },
    ])
  })

  test('groups a position followed by a zaap', () => {
    expect(parsePositions('[-20,-58][zaap:-20,40] ensuite')).toEqual([
      { type: 'position', position: { x: -20, y: -58 }, zaap: { x: -20, y: 40 } },
      { type: 'text', value: ' ensuite' },
    ])
  })

  test('groups a zaap followed by a position', () => {
    expect(parsePositions('[ZAAP : -20 , 40] [-20,-58]')).toEqual([
      { type: 'position', position: { x: -20, y: -58 }, zaap: { x: -20, y: 40 } },
    ])
  })

  test('does not group positions separated by text', () => {
    expect(parsePositions('[1,2] puis [zaap:3,4]')).toEqual([
      { type: 'position', position: { x: 1, y: 2 } },
      { type: 'text', value: ' puis ' },
      { type: 'position', zaap: { x: 3, y: 4 } },
    ])
  })

  test('does not group two positions', () => {
    expect(parsePositions('[1,2] [3,4]')).toEqual([
      { type: 'position', position: { x: 1, y: 2 } },
      { type: 'text', value: ' ' },
      { type: 'position', position: { x: 3, y: 4 } },
    ])
  })
})

describe('getPositionCopyContent', () => {
  test('returns the position when auto travel copy is disabled', () => {
    expect(getPositionCopyContent({ x: -20, y: -58 }, false)).toBe('[-20,-58]')
  })

  test('returns the travel command', () => {
    expect(getPositionCopyContent({ x: -20, y: -58 }, true)).toBe('/travel -20 -58')
  })
})

describe('getChainedCommand', () => {
  test('returns the zaap command alone', () => {
    expect(getChainedCommand({ x: -20, y: 40 })).toBe('/zaap -20 40')
  })

  test('chains the zaap and travel commands', () => {
    expect(getChainedCommand({ x: -20, y: 40 }, { x: -20, y: -58 })).toBe('/zaap -20 40 ; /travel -20 -58')
  })
})
