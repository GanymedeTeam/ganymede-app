import { fromPromise } from 'neverthrow'

import { taurpc } from '@/ipc/ipc.ts'

export class GetPinnedGuidesError extends Error {
  static from(error: unknown) {
    return new GetPinnedGuidesError('Failed to get pinned guides', { cause: error })
  }
}

export function getPinnedGuides() {
  return fromPromise(taurpc.pinnedGuides.get(), GetPinnedGuidesError.from)
}

export class PinGuideError extends Error {
  static from(error: unknown) {
    return new PinGuideError('Failed to pin guide', { cause: error })
  }
}

export function pinGuide(profileId: string, guideId: number) {
  return fromPromise(taurpc.pinnedGuides.pinGuide(profileId, guideId), PinGuideError.from)
}

export class UnpinGuideError extends Error {
  static from(error: unknown) {
    return new UnpinGuideError('Failed to unpin guide', { cause: error })
  }
}

export function unpinGuide(profileId: string, guideId: number) {
  return fromPromise(taurpc.pinnedGuides.unpinGuide(profileId, guideId), UnpinGuideError.from)
}
