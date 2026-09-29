import { type DOMNode, type Element } from 'html-react-parser'

import zaaps from '@/assets/zaaps.json'
import type { Conf } from '@/ipc/bindings.ts'
import { getPositionCopyText } from '@/lib/copy_position.ts'

export const DEFAULT_ZAAP_COPY_MODE = 'Command'
export const DEFAULT_USE_CHAINED_COMMANDS = true

export type Zaap = (typeof zaaps)[number]
export type TravelPreferences = Pick<
  Conf,
  'autoTravelCopy' | 'zaapCopyMode' | 'useChainedCommands' | 'allowZaapSurcharge'
>
export type GuideTravel = { x: number; y: number; zaap: Zaap; crossWorld?: boolean }
export type InlineZaap = { start: number; end: number; zaap: Zaap }

function normalizeTravelInstruction(value: string): string {
  return value
    .normalize('NFD')
    .replace(/\p{M}/gu, '')
    .replace(/[’‘]/gu, "'")
    .replace(/\s+/gu, ' ')
    .trim()
    .toLowerCase()
}

export function resolveZaap(instruction: string): Zaap | undefined {
  const value = normalizeTravelInstruction(instruction)
  const prefixes = [
    'zaap vers la ',
    'zaap vers le ',
    'zaap vers les ',
    "zaap vers l'",
    'zaap vers ',
    'zaap de la ',
    "zaap de l'",
    'zaap du ',
    'zaap des ',
    "zaap d'",
    'zaap de ',
  ]

  const matches = zaaps.filter((zaap) =>
    [zaap.name, ...(zaap.aliases ?? [])].some((name) =>
      prefixes.some((prefix) => value === prefix + normalizeTravelInstruction(name)),
    ),
  )

  return matches.length === 1 ? matches[0] : undefined
}

function isHtmlElement(node: DOMNode, name: string): node is Element {
  return node.type === 'tag' && node.name === name
}

function getNodeText(node: DOMNode): string {
  if (node.type === 'text') return node.data

  if (node.type === 'tag') return node.children.map((child) => getNodeText(child as DOMNode)).join('')

  return ''
}

function containsOnlyInlineText(node: DOMNode): boolean {
  return (
    node.type === 'text' ||
    (node.type === 'tag' &&
      ['p', 'span', 'strong', 'em', 'b', 'i', 'u'].includes(node.name) &&
      !node.attribs['data-type'] &&
      node.children.every((child) => containsOnlyInlineText(child as DOMNode)))
  )
}

function containsOnlyInlineTextInRange(node: DOMNode, start: number, end: number): boolean {
  let offset = 0

  function validateNodeInRange(child: DOMNode): boolean {
    const length = getNodeText(child).length

    if (offset + length <= start || offset >= end) {
      offset += length

      return true
    }

    if (child.type === 'text') {
      offset += length

      return true
    }

    if (
      child.type !== 'tag' ||
      !['p', 'span', 'strong', 'em', 'b', 'i', 'u'].includes(child.name) ||
      child.attribs['data-type']
    )
      return false

    return child.children.every((item) => validateNodeInRange(item as DOMNode))
  }

  return validateNodeInRange(node)
}

function isBlankGuideNode(node: DOMNode): boolean {
  return (
    (node.type === 'text' && !node.data.trim()) ||
    (isHtmlElement(node, 'p') &&
      !getNodeText(node).trim() &&
      node.children.every((child) => child.type === 'text' || (child.type === 'tag' && child.name === 'br')))
  )
}

function getTaskItemParagraph(node: DOMNode): Element | undefined {
  if (!isHtmlElement(node, 'li') || node.attribs['data-type'] !== 'taskItem') return undefined

  const content = node.children.filter((child) => child.type !== 'text' || child.data.trim())

  if (
    content.length !== 2 ||
    content[0].type !== 'tag' ||
    content[0].name !== 'label' ||
    getNodeText(content[0] as DOMNode).trim() !== '' ||
    content[1].type !== 'tag' ||
    content[1].name !== 'div'
  )
    return undefined

  const paragraphs = content[1].children.filter((child) => !isBlankGuideNode(child as DOMNode))

  if (paragraphs.length !== 1) return undefined

  const paragraph = paragraphs[0] as DOMNode

  if (!isHtmlElement(paragraph, 'p') || !containsOnlyInlineText(paragraph)) return undefined

  return paragraph
}

function* iterateGuideContentNodes(nodes: DOMNode[]): Generator<DOMNode> {
  for (const node of nodes) {
    yield node

    if (node.type === 'tag' && ['div', 'ul', 'li'].includes(node.name)) {
      yield* iterateGuideContentNodes(node.children as DOMNode[])
    }
  }
}

function findStandaloneZaaps(nodes: DOMNode[]): Map<DOMNode, Zaap> {
  const zaapNodes = new Map<DOMNode, Zaap>()

  for (const node of nodes) {
    if (!isHtmlElement(node, 'ul') || node.attribs['data-type'] !== 'taskList') continue

    for (const child of node.children) {
      const paragraph = getTaskItemParagraph(child as DOMNode)

      if (!paragraph) continue

      const zaap = resolveZaap(getNodeText(paragraph))

      if (zaap) zaapNodes.set(paragraph, zaap)
    }
  }

  return zaapNodes
}

function findInlineZaapInParagraph(node: DOMNode): InlineZaap | undefined {
  if (!isHtmlElement(node, 'p')) return undefined

  const paragraphText = getNodeText(node)

  if (/\bn['’]avez pas\b/iu.test(paragraphText)) return undefined

  const mention =
    /(?:prenez le|allez au|revenez au|depuis le|sur la map du|téléportez[- ]vous au|pour ceux ayant déjà le)\s+(Zaap .+?)(?=\s+(?:et|pour|mettez|achetez)\b|[,.:;]|$)|\((Zaap [^()]+)\)/iu.exec(
      paragraphText,
    )

  if (!mention) return undefined

  const instruction = mention[1] ?? mention[2]
  const zaap = resolveZaap(instruction)

  if (!zaap) return undefined

  const start = mention.index + mention[0].indexOf(instruction)
  const end = start + instruction.length

  if (!containsOnlyInlineTextInRange(node, start, end)) return undefined

  return { start, end, zaap }
}

function findInlineZaaps(nodes: DOMNode[]): Map<DOMNode, InlineZaap> {
  const inlineZaapNodes = new Map<DOMNode, InlineZaap>()

  for (const node of nodes) {
    const mention = findInlineZaapInParagraph(node)

    if (mention) inlineZaapNodes.set(node, mention)
  }

  return inlineZaapNodes
}

function getGuideWorldMapId(map: string | null | undefined): number | undefined {
  return new Map([
    ['Douze', 1],
    ['Incarnam', 2],
    ['Canopee', 10],
    ['Harebourg', 12],
    ['Crocuzko', 22],
  ]).get(map ?? '')
}

function findZaapsWithPossibleSurcharge(zaapNodes: Map<DOMNode, Zaap>, map: string | null | undefined): Set<DOMNode> {
  const worldMapId = getGuideWorldMapId(map)
  const surchargeZaapNodes = new Set<DOMNode>()

  for (const [node, zaap] of zaapNodes) {
    const mayHaveSurcharge = worldMapId !== undefined ? worldMapId !== zaap.worldMapId : Boolean(map && map !== 'nomap')

    if (mayHaveSurcharge) surchargeZaapNodes.add(node)
  }

  return surchargeZaapNodes
}

function parseTravelDestination(node: DOMNode): { x: number; y: number } | undefined {
  if (!isHtmlElement(node, 'p') || !containsOnlyInlineText(node)) return undefined

  const destination =
    /^(?:ensuite,? |sinon,? |une fois (?:fini|finie|le combat termine|le donjon fini),? )?allez en \[\s*(-?\d+)\s*,\s*(-?\d+)\s*\](?:\s+en (incarnam))?\s*[:.]?$/u.exec(
      normalizeTravelInstruction(getNodeText(node)),
    )

  if (!destination || destination[3]) return undefined

  const x = Number(destination[1])
  const y = Number(destination[2])

  return Number.isSafeInteger(x) && Number.isSafeInteger(y) ? { x, y } : undefined
}

function findFollowingTaskList(nodes: DOMNode[], headingIndex: number): Element | undefined {
  let nextIndex = headingIndex + 1

  while (nextIndex < nodes.length && isBlankGuideNode(nodes[nextIndex])) nextIndex++

  const node = nodes[nextIndex]

  return node && isHtmlElement(node, 'ul') && node.attribs['data-type'] === 'taskList' ? node : undefined
}

function parseCardinalMovement(node: Element): { x: number; y: number } | undefined {
  const movement = /^(\d+) maps? (en haut|en bas|a gauche|a droite)$/u.exec(
    normalizeTravelInstruction(getNodeText(node)),
  )

  if (!movement) return undefined

  const distance = Number(movement[1])

  if (distance < 1 || distance > 1000) return undefined

  switch (movement[2]) {
    case 'en haut':
      return { x: 0, y: -distance }
    case 'en bas':
      return { x: 0, y: distance }
    case 'a gauche':
      return { x: -distance, y: 0 }
    case 'a droite':
      return { x: distance, y: 0 }
    default:
      return undefined
  }
}

function routeReachesDestination(
  paragraphs: (Element | undefined)[],
  zaap: Zaap,
  destination: { x: number; y: number },
): boolean {
  let currentX = zaap.x
  let currentY = zaap.y

  for (const paragraph of paragraphs) {
    if (!paragraph) return false

    const movement = parseCardinalMovement(paragraph)

    if (!movement) return false

    currentX += movement.x
    currentY += movement.y
  }

  return currentX === destination.x && currentY === destination.y
}

function findChainableDestinations(
  nodes: DOMNode[],
  zaapNodes: Map<DOMNode, Zaap>,
  map: string | null | undefined,
): Map<DOMNode, GuideTravel> {
  const destinations = new Map<DOMNode, GuideTravel>()
  const worldMapId = getGuideWorldMapId(map)

  if (worldMapId === undefined) return destinations

  for (const [index, node] of nodes.entries()) {
    const destination = parseTravelDestination(node)

    if (!destination) continue

    const taskList = findFollowingTaskList(nodes, index)

    if (!taskList) continue

    const items = taskList.children.filter((child) => child.type !== 'text' || child.data.trim()) as DOMNode[]
    const paragraphs = items.map(getTaskItemParagraph)
    const firstParagraph = paragraphs[0]
    const zaap = firstParagraph ? zaapNodes.get(firstParagraph) : undefined

    if (!zaap || zaap.worldMapId !== 1) continue

    if (!routeReachesDestination(paragraphs.slice(1), zaap, destination)) continue

    destinations.set(node, {
      ...destination,
      zaap,
      ...(worldMapId !== zaap.worldMapId ? { crossWorld: true } : {}),
    })
  }

  return destinations
}

export function analyzeGuideTravel(
  nodes: DOMNode[],
  context: { game?: string; lang?: string; map?: string | null; guideName?: string },
) {
  if (
    context.game !== 'dofus' ||
    context.lang !== 'fr' ||
    /\bretro\b/u.test(normalizeTravelInstruction(context.guideName ?? ''))
  ) {
    return {
      destinations: new Map<DOMNode, GuideTravel>(),
      zaapNodes: new Map<DOMNode, Zaap>(),
      surchargeZaapNodes: new Set<DOMNode>(),
      inlineZaapNodes: new Map<DOMNode, InlineZaap>(),
    }
  }

  const contentNodes = [...iterateGuideContentNodes(nodes)]
  const zaapNodes = findStandaloneZaaps(contentNodes)
  const inlineZaapNodes = findInlineZaaps(contentNodes)
  const allZaapNodes = new Map(zaapNodes)

  for (const [node, mention] of inlineZaapNodes) allZaapNodes.set(node, mention.zaap)

  return {
    destinations: findChainableDestinations(nodes, zaapNodes, context.map),
    zaapNodes,
    surchargeZaapNodes: findZaapsWithPossibleSurcharge(allZaapNodes, context.map),
    inlineZaapNodes,
  }
}

export function getZaapCopyText(zaap: Zaap, mode: Conf['zaapCopyMode'] = DEFAULT_ZAAP_COPY_MODE): string {
  if (mode === 'Name') return zaap.name

  if (mode === 'Command') return `/zaap ${zaap.x},${zaap.y}`

  return getPositionCopyText(zaap.x, zaap.y, false)
}

export function getTravelCopyText(x: number, y: number, preferences: TravelPreferences, travel?: GuideTravel): string {
  const positionCopyText = getPositionCopyText(x, y, preferences.autoTravelCopy)

  if (!preferences.autoTravelCopy) return positionCopyText

  if (
    (preferences.useChainedCommands ?? DEFAULT_USE_CHAINED_COMMANDS) &&
    (preferences.zaapCopyMode ?? DEFAULT_ZAAP_COPY_MODE) === 'Command' &&
    travel?.x === x &&
    travel.y === y &&
    (!travel.crossWorld || preferences.allowZaapSurcharge === true)
  ) {
    const command = getZaapCopyText(travel.zaap, 'Command')

    return travel.zaap.x === x && travel.zaap.y === y ? command : `${command} ; ${positionCopyText}`
  }

  return positionCopyText
}
