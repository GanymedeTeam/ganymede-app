import { taurpc } from '@/ipc/ipc.ts'
import { fromPromise } from 'neverthrow'

class GetSummaryError extends Error {
  static from(err: unknown) {
    return new GetSummaryError('Cannot get guide summary', { cause: err })
  }
}

export function getGuideSummary(guideId: number) {
  return fromPromise(taurpc.guides.getGuideSummary(guideId), GetSummaryError.from)
}
