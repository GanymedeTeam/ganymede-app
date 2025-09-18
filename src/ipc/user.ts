import { debug } from '@tauri-apps/plugin-log'
import { fromPromise } from 'neverthrow'
import { taurpc } from '@/ipc/ipc.ts'

export class GetMeError extends Error {
  static from(error: unknown) {
    debug('GetMeError.from called with error: ' + JSON.stringify(error, undefined, 2))

    return new GetMeError('Failed to get me', { cause: error })
  }
}

export function getMe() {
  return fromPromise(taurpc.user.getMe(), GetMeError.from)
}
