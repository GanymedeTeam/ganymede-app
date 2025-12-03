import { fromPromise } from 'neverthrow'
import { taurpc } from '@/ipc/ipc.ts'

export class ReregisterShortcutsError extends Error {
  static from(error: unknown) {
    return new ReregisterShortcutsError('Failed to reregister shortcuts', { cause: error })
  }
}

export function reregisterShortcuts() {
  return fromPromise(taurpc.shortcuts.reregister(), ReregisterShortcutsError.from)
}
