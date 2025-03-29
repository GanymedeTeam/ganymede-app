import { taurpc } from '@/ipc/ipc.ts'
import { fromPromise } from 'neverthrow'

class GetIsAppOldVersionError extends Error {
  static from(err: unknown) {
    return new GetIsAppOldVersionError('Cannot get if app is up to date', { cause: err })
  }
}

export function isAppOldVersion() {
  return fromPromise(taurpc.api.isAppVersionOld(), GetIsAppOldVersionError.from)
}
