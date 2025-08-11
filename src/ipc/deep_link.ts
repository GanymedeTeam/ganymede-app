import { taurpc } from '@/ipc/ipc.ts'

export function onOpenGuideRequest(callback: (guide_id: number, step: number) => void) {
  return taurpc.deep_link.openGuideRequest.on(callback)
}
