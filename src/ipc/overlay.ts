import { fromPromise } from 'neverthrow'
import { InteractiveRegion } from '@/ipc/bindings.ts'
import { taurpc } from '@/ipc/ipc.ts'

export class SetInteractiveRegionsError extends Error {
  static from(error: unknown) {
    return new SetInteractiveRegionsError('Failed to set interactive overlay regions', { cause: error })
  }
}

export function setInteractiveRegions(interactiveRegions: InteractiveRegion[]) {
  return fromPromise(taurpc.overlay.setInteractiveRegions(interactiveRegions), SetInteractiveRegionsError.from)
}
