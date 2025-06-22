import { writeText } from '@tauri-apps/plugin-clipboard-manager'

export async function copyPosition(posX: number, posY: number, autoTravelCopy: boolean): Promise<void> {
  let copy = `[${posX},${posY}]`

  if (autoTravelCopy) {
    copy = `/travel ${posX},${posY}`
  }

  await writeText(copy)
}
