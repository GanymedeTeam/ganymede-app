import { invoke } from '@tauri-apps/api/core'
import { fromPromise } from 'neverthrow'

class GetIsAppOldVersionError extends Error {
  static from(err: unknown) {
    return new GetIsAppOldVersionError('Cannot get is old version', { cause: err })
  }
}

export function isAppOldVersion() {
  return fromPromise(
    invoke<{ from: string; to: string; isOld: boolean }>('is_app_version_old'),
    GetIsAppOldVersionError.from,
  )
}
