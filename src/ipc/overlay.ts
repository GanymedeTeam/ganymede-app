import { platform } from '@tauri-apps/plugin-os'
import { fromPromise, okAsync } from 'neverthrow'
import { type InteractiveRegion } from '@/ipc/bindings.ts'
import { taurpc } from '@/ipc/ipc.ts'

export class SetInteractiveRegionsError extends Error {
  static from(error: unknown) {
    return new SetInteractiveRegionsError('Failed to set interactive overlay regions', { cause: error })
  }
}

export function isInteractiveOverlaySupported() {
  try {
    return typeof window !== 'undefined' && platform() === 'windows'
  } catch {
    return false
  }
}

export function setInteractiveRegions(interactiveRegions: InteractiveRegion[]) {
  if (!isInteractiveOverlaySupported()) {
    return okAsync(null)
  }

  return fromPromise(taurpc.overlay.setInteractiveRegions(interactiveRegions), SetInteractiveRegionsError.from)
}
