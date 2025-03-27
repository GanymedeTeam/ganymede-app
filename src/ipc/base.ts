import { taurpc } from '@/ipc/ipc.ts'
import { fromPromise } from 'neverthrow'

export class OpenUrlInBrowserError extends Error {
  static from(error: unknown) {
    return new OpenUrlInBrowserError('Failed to open guide link', { cause: error })
  }
}

export async function openUrlInBrowser(href: string) {
  return fromPromise(taurpc.base.openUrl(href), OpenUrlInBrowserError.from)
}
