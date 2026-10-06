export type Coordinates = { x: number; y: number }

export type PositionToken =
  | { type: 'text'; value: string }
  | { type: 'position'; position?: Coordinates; zaap?: Coordinates }

const COORDINATES_REGEX = /\[\s*(zaap\s*:\s*)?(-?\d+)\s*,\s*(-?\d+)\s*\]/giu

export function parsePositions(text: string): PositionToken[] {
  const tokens: PositionToken[] = []
  let cursor = 0

  for (const match of text.matchAll(COORDINATES_REGEX)) {
    const [raw, zaapPrefix, x, y] = match
    const coordinates = { x: Number.parseInt(x, 10), y: Number.parseInt(y, 10) }
    const isZaap = zaapPrefix !== undefined
    const between = text.slice(cursor, match.index)
    const previous = tokens.at(-1)

    // a position and a zaap next to each other are grouped, whatever their order
    const canMerge =
      previous?.type === 'position' &&
      between.trim() === '' &&
      (isZaap ? previous.zaap === undefined : previous.position === undefined)

    if (canMerge) {
      if (isZaap) {
        previous.zaap = coordinates
      } else {
        previous.position = coordinates
      }
    } else {
      if (between !== '') {
        tokens.push({ type: 'text', value: between })
      }

      tokens.push(isZaap ? { type: 'position', zaap: coordinates } : { type: 'position', position: coordinates })
    }

    cursor = match.index + raw.length
  }

  if (cursor < text.length) {
    tokens.push({ type: 'text', value: text.slice(cursor) })
  }

  return tokens
}

export function getTravelCommand({ x, y }: Coordinates): string {
  return `/travel ${x} ${y}`
}

export function getZaapCommand({ x, y }: Coordinates): string {
  return `/zaap ${x} ${y}`
}

export function getChainedCommand(zaap: Coordinates, position?: Coordinates): string {
  const zaapCommand = getZaapCommand(zaap)

  return position ? `${zaapCommand} ; ${getTravelCommand(position)}` : zaapCommand
}

export function getPositionCopyContent(position: Coordinates, autoTravelCopy: boolean): string {
  return autoTravelCopy ? getTravelCommand(position) : `[${position.x},${position.y}]`
}
