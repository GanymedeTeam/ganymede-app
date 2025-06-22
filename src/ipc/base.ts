import { fromPromise } from 'neverthrow'
import { taurpc } from '@/ipc/ipc.ts'

export class OpenUrlInBrowserError extends Error {
  static from(error: unknown) {
    return new OpenUrlInBrowserError('Failed to open guide link', { cause: error })
  }
}

export async function openUrlInBrowser(href: string) {
  return fromPromise(taurpc.base.openUrl(href), OpenUrlInBrowserError.from)
}

class IsProductionError extends Error {
  static from(err: unknown) {
    return new IsProductionError('Error checking if production', { cause: err })
  }
}

export function isProduction() {
  return fromPromise(taurpc.base.isProduction(), IsProductionError.from)
}

class NewIdError extends Error {
  static from(err: unknown) {
    return new NewIdError('Failed to generate new id', { cause: err })
  }
}

export function newId() {
  return fromPromise(taurpc.base.newId(), NewIdError.from)
}
