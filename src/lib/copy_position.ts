import { writeText } from '@tauri-apps/plugin-clipboard-manager'

export function getPositionCopyText(posX: number, posY: number, autoTravelCopy: boolean): string {
  return autoTravelCopy ? `/travel ${posX},${posY}` : `[${posX},${posY}]`
}

export async function copyPosition(posX: number, posY: number, autoTravelCopy: boolean): Promise<void> {
  await writeText(getPositionCopyText(posX, posY, autoTravelCopy))
}
