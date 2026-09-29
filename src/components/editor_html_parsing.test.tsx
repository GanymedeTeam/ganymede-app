// @vitest-environment jsdom
import { setupI18n } from '@lingui/core'
import { I18nProvider } from '@lingui/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { writeText } from '@tauri-apps/plugin-clipboard-manager'
import { act } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { toast } from 'sonner'
import { afterEach, beforeEach, expect, test, vi } from 'vitest'

import { EditorHtmlParsing } from '@/components/editor_html_parsing.tsx'
import downloadedCases from '@/lib/fixtures/downloaded_zaap_cases.json'
import fixtures from '@/lib/fixtures/guide_travel.json'

const mocks = vi.hoisted(() => ({ toggleGuideCheckbox: vi.fn() }))

vi.mock('@tauri-apps/plugin-clipboard-manager', () => ({ writeText: vi.fn() }))
vi.mock('@tanstack/react-router', () => ({ useNavigate: () => vi.fn(), Link: () => null }))

vi.mock('@/queries/conf.query.ts', () => ({ confQuery: { queryKey: ['conf'] } }))
vi.mock('@/queries/white_list.query.ts', () => ({ whiteListQuery: { queryKey: ['whitelist'] } }))
vi.mock('@/queries/guides.query.ts', () => ({ guidesQuery: () => ({ queryKey: ['guides'] }) }))

vi.mock('@/hooks/use_profile.ts', () => ({ useProfile: () => ({ progresses: [] }) }))

vi.mock('@/mutations/toggle_guide_checkbox.mutation.ts', () => ({
  useToggleGuideCheckbox: () => ({ mutate: mocks.toggleGuideCheckbox }),
}))
vi.mock('@/mutations/download_guide_from_server.mutation.ts', () => ({ useDownloadGuideFromServer: () => ({}) }))
vi.mock('@/mutations/open_image_viewer.mutation.ts', () => ({ useOpenImageViewer: () => ({}) }))
vi.mock('@/mutations/open_url_in_browser.ts', () => ({ useOpenUrlInBrowser: () => ({}) }))

vi.mock('@/components/download_image.tsx', () => ({ DownloadImage: () => null }))
vi.mock('sonner', () => ({ toast: Object.assign(vi.fn(), { error: vi.fn() }) }))

const i18n = setupI18n({ locale: 'fr', messages: {} })

let container: HTMLDivElement
let root: Root
let client: QueryClient

beforeEach(() => {
  vi.clearAllMocks()
  vi.mocked(writeText).mockResolvedValue(undefined)

  client = new QueryClient({ defaultOptions: { queries: { retry: false, staleTime: Infinity } } })
  client.setQueryData(['conf'], { autoTravelCopy: true, zaapCopyMode: 'Command', useChainedCommands: true })
  client.setQueryData(['whitelist'], [])
  client.setQueryData(['guides'], [{ id: 30, name: 'Moon', lang: 'fr', game_type: 'dofus', steps: [{ map: 'Douze' }] }])

  container = document.createElement('div')
  document.body.append(container)
  root = createRoot(container)
})

afterEach(async () => {
  await act(async () => root.unmount())

  client.clear()
  container.remove()
})

async function renderGuideHtml(html = fixtures[0].html) {
  await act(async () =>
    root.render(
      <QueryClientProvider client={client}>
        <I18nProvider i18n={i18n}>
          <EditorHtmlParsing html={html} guideId={30} stepIndex={0} />
        </I18nProvider>
      </QueryClientProvider>,
    ),
  )
}

function getButtonByText(label: string) {
  const button = [...container.querySelectorAll('button')].find((node) => node.textContent?.includes(label))

  if (!button) throw new Error(`Missing button: ${label}`)

  return button
}

test('renders real guide HTML with independent zaap, destination and checkbox actions', async () => {
  await renderGuideHtml()

  expect(container.querySelectorAll('input[type=checkbox]')).toHaveLength(3)
  expect(getButtonByText('Coin des Bouftous').querySelectorAll('span')).toHaveLength(2)

  await act(async () => getButtonByText('Coin des Bouftous').click())

  expect(writeText).toHaveBeenLastCalledWith('/zaap 5,7')

  await act(async () => getButtonByText('[11,10]').click())

  expect(writeText).toHaveBeenLastCalledWith('/zaap 5,7 ; /travel 11,10')
  expect(mocks.toggleGuideCheckbox).not.toHaveBeenCalled()

  await act(async () => container.querySelector('input')!.click())

  expect(mocks.toggleGuideCheckbox).toHaveBeenCalledWith({
    guideId: 30,
    stepIndex: 0,
    checkboxIndex: 0,
    guideName: 'Moon',
  })
})

test('updates copy modes after a settings change without changing guide content', async () => {
  await renderGuideHtml()

  await act(async () => {
    client.setQueryData(['conf'], { autoTravelCopy: true, zaapCopyMode: 'Name', useChainedCommands: true })

    await new Promise((resolve) => setTimeout(resolve, 10))
  })

  await act(async () => getButtonByText('Coin des Bouftous').click())

  expect(writeText).toHaveBeenLastCalledWith('Coin des Bouftous')

  await act(async () => getButtonByText('[11,10]').click())

  expect(writeText).toHaveBeenLastCalledWith('/travel 11,10')
})

test('copies Astrub independently in the real route through the Incarnam portal', async () => {
  const fixture = fixtures.find((fixture) => fixture.html.includes('Portail vers Incarnam'))!
  client.setQueryData(
    ['guides'],
    [{ id: 30, name: 'Astrub', lang: 'fr', game_type: 'dofus', steps: [{ map: fixture.map }] }],
  )

  await renderGuideHtml(fixture.html)

  expect(container.querySelectorAll('input[type=checkbox]')).toHaveLength(6)

  const zaapButton = getButtonByText("Cité d'Astrub")

  expect(zaapButton.querySelectorAll('span')).toHaveLength(2)

  await act(async () => zaapButton.click())

  expect(writeText).toHaveBeenLastCalledWith('/zaap 5,-18')
  expect(mocks.toggleGuideCheckbox).not.toHaveBeenCalled()

  await act(async () => getButtonByText('[0,0]').click())

  expect(writeText).toHaveBeenLastCalledWith('/travel 0,0')
})

test('copies both zaaps in the conditional Harebourg route while preserving text, colors and coordinates', async () => {
  const fixture = fixtures.find((fixture) => fixture.html.includes('Pour ceux ayant déjà'))!
  client.setQueryData(
    ['guides'],
    [{ id: 30, name: 'Frigost 3', lang: 'fr', game_type: 'dofus', steps: [{ map: null }] }],
  )

  await renderGuideHtml(fixture.html)

  const castle = getButtonByText('Entrée du château de Harebourg')

  expect(castle.textContent).toBe("Zaap de l'Entrée du château de Harebourg")
  expect(castle.querySelectorAll('span')).toHaveLength(2)

  for (const span of castle.querySelectorAll('span')) {
    expect(span.style.color).toBe('rgb(98, 172, 255)')
  }

  expect(castle.parentElement?.textContent).toBe(
    "Pour ceux ayant déjà le Zaap de l'Entrée du château de Harebourg, allez en [-68,-78] puis à l'étape suivante.",
  )
  expect(castle.querySelector('button')).toBeNull()

  await act(async () => castle.click())

  expect(writeText).toHaveBeenLastCalledWith('/zaap -67,-77')

  await act(async () => getButtonByText('La Bourgade').click())

  expect(writeText).toHaveBeenLastCalledWith('/zaap -78,-41')
  expect(mocks.toggleGuideCheckbox).not.toHaveBeenCalled()

  for (const position of ['-68,-78', '-68,-75']) {
    await act(async () => getButtonByText(`[${position}]`).click())

    expect(writeText).toHaveBeenLastCalledWith(`/travel ${position}`)
  }

  expect(container.querySelectorAll('input[type=checkbox]')).toHaveLength(11)
})

test('does not apply a route to another occurrence of the same coordinates', async () => {
  await renderGuideHtml(`<p>Astuce : [11,10]</p>${fixtures[0].html}`)

  const positions = [...container.querySelectorAll('button')].filter((node) => node.textContent === '[11,10]')

  expect(positions).toHaveLength(2)

  await act(async () => positions[0].click())

  expect(writeText).toHaveBeenLastCalledWith('/travel 11,10')

  await act(async () => positions[1].click())

  expect(writeText).toHaveBeenLastCalledWith('/zaap 5,7 ; /travel 11,10')
})

test('copies the Porkass zaap after the Astrub portal without chaining the route from Incarnam', async () => {
  const fixture = fixtures.find((fixture) => fixture.html.includes('Plaine des Porkass'))!
  client.setQueryData(
    ['guides'],
    [{ id: 30, name: 'Astrub', lang: 'fr', game_type: 'dofus', steps: [{ map: fixture.map }] }],
  )

  await renderGuideHtml(fixture.html)

  expect(container.querySelectorAll('input[type=checkbox]')).toHaveLength(7)

  const zaapButton = getButtonByText('Plaine des Porkass')

  expect(zaapButton.querySelectorAll('span')).toHaveLength(2)

  await act(async () => zaapButton.click())

  expect(writeText).toHaveBeenLastCalledWith('/zaap -5,-23')
  expect(mocks.toggleGuideCheckbox).not.toHaveBeenCalled()

  await act(async () => getButtonByText('[-4,-24]').click())

  expect(writeText).toHaveBeenLastCalledWith('/travel -4,-24')
})

test('warns on inter-world copying and only enables chaining after surcharge permission', async () => {
  client.setQueryData(
    ['guides'],
    [{ id: 30, name: 'Moon', lang: 'fr', game_type: 'dofus', steps: [{ map: 'Incarnam' }] }],
  )

  await renderGuideHtml()

  const zaapButton = getButtonByText('Coin des Bouftous')

  expect(zaapButton.title).toBe('Copier : /zaap 5,7')

  await act(async () => zaapButton.click())

  expect(writeText).toHaveBeenLastCalledWith('/zaap 5,7')
  expect(toast).toHaveBeenLastCalledWith('/zaap 5,7 copié', {
    description: "Surtaxe possible de 1000k lors de l'utilisation de ce zaap depuis un autre monde",
    classNames: { description: 'text-orange-400!' },
  })

  await act(async () => getButtonByText('[11,10]').click())

  expect(writeText).toHaveBeenLastCalledWith('/travel 11,10')
  expect(toast).toHaveBeenLastCalledWith('/travel 11,10 copié', undefined)

  await act(async () => {
    client.setQueryData(['conf'], {
      autoTravelCopy: true,
      zaapCopyMode: 'Command',
      useChainedCommands: true,
      allowZaapSurcharge: true,
    })

    await new Promise((resolve) => setTimeout(resolve, 10))
  })

  expect(document.querySelector('[role="tooltip"]')).toBeNull()

  await act(async () => getButtonByText('[11,10]').click())

  expect(writeText).toHaveBeenLastCalledWith('/zaap 5,7 ; /travel 11,10')
  expect(toast).toHaveBeenLastCalledWith('/zaap 5,7 ; /travel 11,10 copié', undefined)
  expect(mocks.toggleGuideCheckbox).not.toHaveBeenCalled()
})

test.each([
  { game_type: 'wakfu', name: 'Other game' },
  { game_type: 'unknown', name: 'Other game' },
  { game_type: 'dofus', name: '[Rétro] Test route' },
])('does not enable zaap copying or chaining for $game_type / $name', async ({ game_type, name }) => {
  client.setQueryData(['guides'], [{ id: 30, name, lang: 'fr', game_type, steps: [{ map: 'Douze' }] }])

  await renderGuideHtml()

  expect(container.querySelectorAll('input[type=checkbox]')).toHaveLength(3)
  expect(
    [...container.querySelectorAll('button')].some((node) => node.textContent?.includes('Coin des Bouftous')),
  ).toBe(false)

  await act(async () => getButtonByText('[11,10]').click())

  expect(writeText).toHaveBeenCalledExactlyOnceWith('/travel 11,10')
  expect(mocks.toggleGuideCheckbox).not.toHaveBeenCalled()
})

test.each([
  [189, 3, 'Village de Pandala', '/zaap 20,-29', 'Pandaporo'],
  [2747, 38, 'Bonta', '/zaap -31,-56', 'Un juge hystérique'],
] as const)('preserves adjacent custom tags in guide %s step %s', async (guide, step, zaap, command, adjacent) => {
  const fixture = downloadedCases.find(
    (entry) => entry.guide === guide && entry.step === step && entry.text.includes(zaap),
  )!

  await renderGuideHtml(fixture.html)

  expect(container.textContent).toBe(fixture.text)

  const zaapButton = getButtonByText(zaap)
  const adjacentButton = getButtonByText(adjacent)

  expect(zaapButton.contains(adjacentButton)).toBe(false)
  expect(container.querySelector('button button')).toBeNull()

  await act(async () => zaapButton.click())

  expect(writeText).toHaveBeenLastCalledWith(command)

  await act(async () => adjacentButton.click())

  expect(writeText).toHaveBeenLastCalledWith(adjacent)
  expect(mocks.toggleGuideCheckbox).not.toHaveBeenCalled()
})
