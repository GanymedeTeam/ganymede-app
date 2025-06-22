import { fromPromise } from 'neverthrow'
import { taurpc } from '@/ipc/ipc.ts'

class StartUpdateError extends Error {
  static from(err: unknown) {
    return new StartUpdateError('Cannot start update', { cause: err })
  }
}

export function startUpdate() {
  return fromPromise(taurpc.update.startUpdate(), StartUpdateError.from)
}
