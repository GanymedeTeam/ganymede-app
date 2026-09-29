import { htmlToDOM } from 'html-react-parser'
import { describe, expect, test, vi } from 'vitest'

import downloadedCases from '@/lib/fixtures/downloaded_zaap_cases.json'
import fixtures from '@/lib/fixtures/guide_travel.json'
import { analyzeGuideTravel, getTravelCopyText, getZaapCopyText, resolveZaap } from '@/lib/guide_travel_action.ts'

vi.mock('@tauri-apps/plugin-clipboard-manager', () => ({ writeText: vi.fn() }))

const context = { game: 'dofus', lang: 'fr', map: 'Douze' }
const moon = fixtures[0].html
const zaap = resolveZaap('Zaap du Coin des Bouftous')!

function createTaskItemHtml(value: string): string {
  return `<li data-type="taskItem"><label><input type="checkbox"><span></span></label><div><p>${value}</p></div></li>`
}

function createRouteHtml(actions: string[], destination = '11,10'): string {
  const taskItems = actions.map(createTaskItemHtml).join('')

  return `<p>Ensuite allez en [${destination}]</p><p></p><ul data-type="taskList">${taskItems}</ul>`
}

function analyzeGuideHtml(html: string) {
  return analyzeGuideTravel(htmlToDOM(html), context)
}

function serializeGuideNodes(nodes: ReturnType<typeof htmlToDOM>): string {
  return JSON.stringify(nodes, (key, value) => (['parent', 'prev', 'next'].includes(key) ? undefined : value))
}

describe('existing guide travel blocks', () => {
  test.each(fixtures)('$source / step $step', (fixture) => {
    const result = analyzeGuideTravel(htmlToDOM(fixture.html), { ...context, map: fixture.map })

    expect(result.destinations.size).toBe(fixture.chains)
    expect(result.zaapNodes.size).toBe(fixture.zaaps)
  })

  test('associates the Moon destination with its zaap across spans and empty paragraphs', () => {
    expect([...analyzeGuideHtml(moon).destinations.values()]).toEqual([{ x: 11, y: 10, zaap }])
  })

  test.each([
    ['Sortez', 'Zaap du Coin des Bouftous', '3 maps en bas', '6 maps à droite'],
    ['Zaap du Coin des Bouftous', '3 maps en bas', 'Cliquez sur la statue', '6 maps à droite'],
    ['Zaap du Coin des Bouftous', 'Zaapi vers le Quai de la Bricole', '3 maps en bas', '6 maps à droite'],
    ['Zaap du Coin des Bouftous', '3 maps en bas', '6 maps à droite pour débloquer le zaap'],
    ['Zaap du Coin des Bouftous', '3 maps en bas', '5 maps à droite'],
    ['Zaap du Coin des Bouftous', 'Portail vers Incarnam'],
    ['Ne prenez pas le Zaap du Coin des Bouftous', '3 maps en bas', '6 maps à droite'],
    ['Zaap du lieu inconnu', '3 maps en bas', '6 maps à droite'],
  ])('does not collapse an unsafe or inconsistent route: %j', (...actions) => {
    expect(analyzeGuideHtml(createRouteHtml(actions)).destinations.size).toBe(0)
  })

  test.each([
    { ...context, game: 'wakfu' },
    { ...context, game: 'dofus-retro' },
    { ...context, game: 'unknown' },
    { ...context, guideName: '[Retro] Leveling Quête serveurs saisonniers' },
    { ...context, guideName: 'Rush rétro saisonnier' },
    { ...context, lang: 'en' },
    {},
  ])('requires a supported game and language: %j', (unsupported) => {
    const result = analyzeGuideTravel(htmlToDOM(moon), unsupported)

    expect(result.zaapNodes.size).toBe(0)
    expect(result.destinations.size).toBe(0)
  })

  test.each([null, undefined, 'unknown', 'Srambad'])(
    'copies a known zaap without chaining when the step world is unresolved: %s',
    (map) => {
      const result = analyzeGuideTravel(htmlToDOM(moon), { ...context, map })

      expect(result.zaapNodes.size).toBe(1)
      expect(result.destinations.size).toBe(0)
    },
  )

  test.each([undefined, false, true])('gates inter-world chaining on surcharge permission %s', (allowZaapSurcharge) => {
    const result = analyzeGuideTravel(htmlToDOM(moon), { ...context, map: 'Incarnam' })
    const travel = [...result.destinations.values()][0]

    expect(result.zaapNodes.size).toBe(1)
    expect(result.surchargeZaapNodes.size).toBe(1)
    expect(travel.crossWorld).toBe(true)
    expect(getTravelCopyText(11, 10, { autoTravelCopy: true, allowZaapSurcharge }, travel)).toBe(
      allowZaapSurcharge ? '/zaap 5,7 ; /travel 11,10' : '/travel 11,10',
    )
    expect(getZaapCopyText(travel.zaap)).toBe('/zaap 5,7')
  })

  test('surcharge permission does not bypass portals, exits or unknown starting maps', () => {
    for (const map of [null, 'Incarnam']) {
      const html = createRouteHtml([
        'Zaap du Coin des Bouftous',
        'Portail vers Astrub',
        '3 maps en bas',
        '6 maps à droite',
      ])
      const result = analyzeGuideTravel(htmlToDOM(html), { ...context, map })

      expect(result.destinations.size).toBe(0)
      expect(getTravelCopyText(11, 10, { autoTravelCopy: true, allowZaapSurcharge: true })).toBe('/travel 11,10')
    }
  })

  test('does not chain a destination in Incarnam even if directions match', () => {
    const html = createRouteHtml(['Zaap du Coin des Bouftous', '3 maps en bas', '6 maps à droite']).replace(
      '[11,10]',
      '[11,10] en Incarnam.',
    )
    const result = analyzeGuideHtml(html)

    expect(result.zaapNodes.size).toBe(1)
    expect(result.destinations.size).toBe(0)
  })

  test('does not associate unrelated or repeated coordinates elsewhere in the step', () => {
    const result = analyzeGuideHtml(`<p>Astuce : [11,10]</p>${moon}<p>Ensuite allez en [11,10]</p>`)

    expect(result.destinations.size).toBe(1)
  })

  test('stops at an interaction between the destination and the list', () => {
    expect(analyzeGuideHtml(moon.replace('<ul', '<p>Parlez au PNJ.</p><ul')).destinations.size).toBe(0)
  })

  test('does not inspect a quest block or a link as a travel block', () => {
    expect(analyzeGuideHtml(`<div data-type="quest-block">${moon}</div>`).destinations.size).toBe(0)
    expect(
      analyzeGuideHtml(createRouteHtml(['<a href="https://example.com">Zaap du Coin des Bouftous</a>'])).zaapNodes.size,
    ).toBe(0)
  })

  test.each([
    ['Douze', 1],
    ['Harebourg', 0],
    [null, 0],
  ] as const)('uses the castle zaap world for conditional-copy warnings from %s', (map, warnings) => {
    const html =
      "<p>Pour ceux ayant déjà le Zaap de l'Entrée du château de Harebourg, allez en [-68,-78] puis à l'étape suivante.</p>"
    const result = analyzeGuideTravel(htmlToDOM(html), { ...context, map })

    expect(result.inlineZaapNodes.size).toBe(1)
    expect(result.surchargeZaapNodes.size).toBe(warnings)
    expect(result.destinations.size).toBe(0)
  })

  test('copies exact standalone zaap instructions without a heading but ignores negative mentions', () => {
    const html =
      '<ul data-type="taskList">' +
      ['Zaap de La Bourgade', 'Ne prenez pas le Zaap de La Bourgade'].map(createTaskItemHtml).join('') +
      '</ul>'
    const result = analyzeGuideHtml(html)

    expect(result.zaapNodes.size).toBe(1)
    expect(result.destinations.size).toBe(0)
  })

  test('does not mutate HTML nodes or checkbox state', () => {
    const nodes = htmlToDOM(moon)
    const originalNodes = serializeGuideNodes(nodes)

    analyzeGuideTravel(nodes, context)

    expect(serializeGuideNodes(nodes)).toBe(originalNodes)
  })
})

describe('copy preferences', () => {
  test.each([
    ['Name', 'Coin des Bouftous'],
    ['Position', '[5,7]'],
    ['Command', '/zaap 5,7'],
    [undefined, '/zaap 5,7'],
  ] as const)('copies a zaap in mode %s', (mode, expected) => {
    expect(getZaapCopyText(zaap, mode)).toBe(expected)
  })

  test.each([
    [false, false, 'Name', '[11,10]'],
    [false, false, 'Position', '[11,10]'],
    [false, false, 'Command', '[11,10]'],
    [false, true, 'Name', '[11,10]'],
    [false, true, 'Position', '[11,10]'],
    [false, true, 'Command', '[11,10]'],
    [true, false, 'Name', '/travel 11,10'],
    [true, false, 'Position', '/travel 11,10'],
    [true, false, 'Command', '/travel 11,10'],
    [true, true, 'Name', '/travel 11,10'],
    [true, true, 'Position', '/travel 11,10'],
    [true, true, 'Command', '/zaap 5,7 ; /travel 11,10'],
  ] as const)(
    'destination: autopilot=%s, chained=%s, zaap=%s',
    (autoTravelCopy, useChainedCommands, zaapCopyMode, expected) => {
      const preferences = { autoTravelCopy, useChainedCommands, zaapCopyMode }
      const copiedText = getTravelCopyText(11, 10, preferences, { x: 11, y: 10, zaap })

      expect(copiedText).toBe(expected)
      expect(getZaapCopyText(zaap, zaapCopyMode)).not.toContain(';')
    },
  )

  test('old preferences and calls without a route keep their current behavior', () => {
    expect(getTravelCopyText(11, 10, { autoTravelCopy: true })).toBe('/travel 11,10')
    expect(getTravelCopyText(11, 10, { autoTravelCopy: false })).toBe('[11,10]')
    expect(
      getTravelCopyText(
        1,
        2,
        { autoTravelCopy: true, zaapCopyMode: 'Command', useChainedCommands: true },
        { x: 11, y: 10, zaap },
      ),
    ).toBe('/travel 1,2')
  })

  test('defaults missing preferences to zaap commands and chained travel', () => {
    expect(getZaapCopyText(zaap, undefined)).toBe('/zaap 5,7')

    const travel = { x: 11, y: 10, zaap }

    expect(getTravelCopyText(11, 10, { autoTravelCopy: true }, travel)).toBe('/zaap 5,7 ; /travel 11,10')
    expect(getTravelCopyText(11, 10, { autoTravelCopy: true, useChainedCommands: false }, travel)).toBe('/travel 11,10')
    expect(getTravelCopyText(11, 10, { autoTravelCopy: false }, travel)).toBe('[11,10]')
  })

  test('omits travel when the destination is the zaap itself', () => {
    const travel = [...analyzeGuideHtml(createRouteHtml(['Zaap du Coin des Bouftous'], '5,7')).destinations.values()][0]

    expect(
      getTravelCopyText(5, 7, { autoTravelCopy: true, zaapCopyMode: 'Command', useChainedCommands: true }, travel),
    ).toBe('/zaap 5,7')
  })

  test('normalizes apostrophes, accents, case and nonbreaking spaces, but never guesses names', () => {
    expect(resolveZaap('Zaap de la Cité d’Astrub')?.x).toBe(5)
    expect(resolveZaap('ZAAP DU COIN\u00a0DES BOUFTOUS')).toEqual(zaap)
    expect(resolveZaap('Zaap du Coin des Bouftou')).toBeUndefined()
    expect(resolveZaap('Cliquez sur le Zaap du Coin des Bouftous')).toBeUndefined()
    expect(resolveZaap('Zaapi du Coin des Bouftous')).toBeUndefined()
    expect(resolveZaap('Zaap de La Bourgade')?.name).toBe('La Bourgade')
    expect(resolveZaap('Zaap de l’Entrée du château de Harebourg')).toMatchObject({ x: -67, y: -77, worldMapId: 12 })
  })
})

test('preserves the three-argument copyPosition contract used by PR #178', async () => {
  const { copyPosition } = await import('@/lib/copy_position.ts')
  const { writeText } = await import('@tauri-apps/plugin-clipboard-manager')

  await copyPosition(5, 7, true)

  expect(writeText).toHaveBeenLastCalledWith('/travel 5,7')

  await copyPosition(5, 7, false)

  expect(writeText).toHaveBeenLastCalledWith('[5,7]')
})

describe('audited downloaded guide formats', () => {
  test.each(downloadedCases)('guide $guide / step $step / $text', ({ html, map, expected }) => {
    const result = analyzeGuideTravel(htmlToDOM(html), { ...context, map })
    const found = [...result.zaapNodes.values(), ...[...result.inlineZaapNodes.values()].map(({ zaap }) => zaap)]

    expect(found.map(({ id, x, y }) => ({ id, x, y }))).toEqual(expected ? [expected] : [])
    expect(result.destinations.size).toBe(0)
  })

  test.each([
    '<p>Ne prenez le Zaap de Bonta sous aucun prétexte.</p>',
    '<p>Prenez le <a href="https://example.com">Zaap de Bonta</a>.</p>',
    '<p>Prenez le <span data-type="custom-tag">Zaap de Bonta</span>.</p>',
    '<p>Si vous n’avez pas le Zaap de Bonta, allez à pied.</p>',
  ])('does not turn unsafe or interactive mentions into zaap copies: %s', (html) => {
    const result = analyzeGuideHtml(html)

    expect(result.inlineZaapNodes.size).toBe(0)
  })
})
