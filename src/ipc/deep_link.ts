import { OpenGuideStep } from '@/ipc/bindings.ts'
import { taurpc } from '@/ipc/ipc.ts'

export function onOpenGuideRequest(callback: (guide_id: number, step: OpenGuideStep) => void) {
  return taurpc.deep_link.openGuideRequest.on(callback)
}
