import { fromPromise } from 'neverthrow'

import { taurpc } from '@/ipc/ipc.ts'

export class OpenHuntError extends Error {
  static from(error: unknown) {
    return new OpenHuntError('Failed to open dofusdb hunt window', { cause: error })
  }
}

export function openHunt(lang: string) {
  return fromPromise(taurpc.dofusdb.openHunt(lang), OpenHuntError.from)
}
