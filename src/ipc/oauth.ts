import { fromPromise } from 'neverthrow'
import { taurpc } from '@/ipc/ipc.ts'

export class StartOAuthFlowError extends Error {
  static from(error: unknown) {
    return new StartOAuthFlowError('Failed to start oauth flow', { cause: error })
  }
}

export class GetAuthTokensError extends Error {
  static from(error: unknown) {
    return new GetAuthTokensError('Failed to get auth tokens', { cause: error })
  }
}

export class CleanAuthTokensError extends Error {
  static from(error: unknown) {
    return new CleanAuthTokensError('Failed to clean auth tokens', { cause: error })
  }
}

export async function startOAuthFlow() {
  return fromPromise(taurpc.oauth.startOAuthFlow(), StartOAuthFlowError.from)
}

export async function getAuthTokens() {
  return fromPromise(taurpc.oauth.getAuthTokens(), GetAuthTokensError.from)
}

export async function cleanAuthTokens() {
  return fromPromise(taurpc.oauth.cleanAuthTokens(), CleanAuthTokensError.from)
}
