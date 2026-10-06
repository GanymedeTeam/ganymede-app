import { writeText } from '@tauri-apps/plugin-clipboard-manager'

import { type Coordinates, getChainedCommand, getPositionCopyContent } from '@/lib/positions.ts'

export async function copyPosition(posX: number, posY: number, autoTravelCopy: boolean): Promise<string> {
  const copy = getPositionCopyContent({ x: posX, y: posY }, autoTravelCopy)

  await writeText(copy)

  return copy
}

export async function copyZaap(zaap: Coordinates, position?: Coordinates): Promise<string> {
  const copy = getChainedCommand(zaap, position)

  await writeText(copy)

  return copy
}
