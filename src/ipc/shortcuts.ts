import { fromPromise } from 'neverthrow'

import { taurpc } from '@/ipc/ipc.ts'

export class ReregisterShortcutsError extends Error {
  static from(error: unknown) {
    return new ReregisterShortcutsError('Failed to reregister shortcuts', { cause: error })
  }
}

export class UnregisterAllShortcutsError extends Error {
  static from(error: unknown) {
    return new UnregisterAllShortcutsError('Failed to unregister all shortcuts', { cause: error })
  }
}

let queue: Promise<unknown> = Promise.resolve()

// Serialize calls so a blur followed by a focus cannot be applied out of order
function enqueue<T>(fn: () => Promise<T>): Promise<T> {
  const next = queue.then(fn, fn)
  queue = next.catch(() => undefined)
  return next
}

export function reregisterShortcuts() {
  return fromPromise(
    enqueue(() => taurpc.shortcuts.reregister()),
    ReregisterShortcutsError.from,
  )
}

export function unregisterAllShortcuts() {
  return fromPromise(
    enqueue(() => taurpc.shortcuts.unregisterAll()),
    UnregisterAllShortcutsError.from,
  )
}
