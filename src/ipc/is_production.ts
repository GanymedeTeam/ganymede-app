import { taurpc } from '@/ipc/ipc.ts'
import { fromPromise } from 'neverthrow'

class IsProductionError extends Error {
  static from(err: unknown) {
    return new IsProductionError('Error checking if production', { cause: err })
  }
}

export function isProduction() {
  return fromPromise(taurpc.base.is_production(), IsProductionError.from)
}
