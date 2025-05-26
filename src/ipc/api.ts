import { taurpc } from '@/ipc/ipc.ts'
import { fromPromise } from 'neverthrow'

export class GetIsAppOldVersionError extends Error {
  static from(err: unknown) {
    return new GetIsAppOldVersionError('Cannot get if app is up to date', { cause: err })
  }

  isGitHubError() {
    return this.hasCause() && 'GitHub' in this.cause
  }

  isJsonMalformedError() {
    return this.hasCause() && 'JsonMalformed' in this.cause
  }

  isSemverParseError() {
    return this.hasCause() && 'SemverParse' in this.cause
  }

  private hasCause(): this is { cause: object } {
    return typeof this.cause === 'object' && this.cause !== null
  }
}

export function isAppOldVersion() {
  return fromPromise(taurpc.api.isAppVersionOld(), GetIsAppOldVersionError.from)
}
