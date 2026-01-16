import { error } from '@tauri-apps/plugin-log'
import { fromPromise, ResultAsync } from 'neverthrow'
import { GuideOrFolderToDelete, Status } from '@/ipc/bindings.ts'
import { GuideWithStepsWithFolder, taurpc } from '@/ipc/ipc.ts'

export class GetGuidesError extends Error {
  static from(error: unknown) {
    console.log(error)
    return new GetGuidesError('Failed to get guides', { cause: error })
  }
}

export function getGuides(folder?: string) {
  return fromPromise(taurpc.guides.getGuides(folder ?? null), GetGuidesError.from)
}

export class GetFlatGuidesError extends Error {
  static from(err: unknown) {
    error('Failed to get flat guides').then(() => {
      return error(JSON.stringify(err, undefined, 2))
    })

    return new GetFlatGuidesError('Failed to get flat guides', {
      cause: !(err instanceof Error) ? new Error(JSON.stringify(err, undefined, 2)) : err,
    })
  }
}

export function getFlatGuides(folder: string) {
  return fromPromise(taurpc.guides.getFlatGuides(folder), GetFlatGuidesError.from) as ResultAsync<
    GuideWithStepsWithFolder[],
    GetFlatGuidesError
  >
}

export class DownloadGuideFromServerError extends Error {
  static from(error: unknown) {
    return new DownloadGuideFromServerError('Failed to download guide', { cause: error })
  }
}

export async function downloadGuideFromServer(guideId: number, folder: string) {
  return fromPromise(taurpc.guides.downloadGuideFromServer(guideId, folder), DownloadGuideFromServerError.from)
}

export class OpenGuidesFolderError extends Error {
  static from(error: unknown) {
    return new OpenGuidesFolderError('Failed to open guides folder', { cause: error })
  }
}

export async function openGuidesFolder() {
  return fromPromise(taurpc.guides.openGuidesFolder(), OpenGuidesFolderError.from)
}

class GetSummaryError extends Error {
  static from(err: unknown) {
    return new GetSummaryError('Cannot get guide summary', { cause: err })
  }
}

export function getGuideSummary(guideId: number) {
  return fromPromise(taurpc.guides.getGuideSummary(guideId), GetSummaryError.from)
}

export class GetGuidesFromServerError extends Error {
  static from(error: unknown) {
    return new GetGuidesFromServerError('Failed to get guides', { cause: error })
  }
}

export function getGuidesFromServer(status: Status) {
  return fromPromise(taurpc.guides.getGuidesFromServer(status), GetGuidesFromServerError.from)
}

export class GetGuideFromServerError extends Error {
  static from(error: unknown) {
    return new GetGuideFromServerError('Failed to get guide', { cause: error })
  }
}

export function getGuideFromServer(guideId: number) {
  return fromPromise(taurpc.guides.getGuideFromServer(guideId), GetGuideFromServerError.from)
}

export class UpdateAllAtOnceError extends Error {
  static from(error: unknown) {
    return new UpdateAllAtOnceError('Failed to update all guides at once', { cause: error })
  }
}

export function updateAllAtOnce() {
  return fromPromise(taurpc.guides.updateAllAtOnce(), UpdateAllAtOnceError.from)
}

export class HasGuidesNotUpdatedError extends Error {
  static from(error: unknown) {
    return new HasGuidesNotUpdatedError('Failed to retrieve not updated guides', { cause: error })
  }
}

export function hasGuidesNotUpdated() {
  return fromPromise(taurpc.guides.hasGuidesNotUpdated(), HasGuidesNotUpdatedError.from)
}

export class DeleteGuidesInSystemError extends Error {
  static from(error: unknown) {
    return new DeleteGuidesInSystemError('Failed to delete guide from system', { cause: error })
  }
}

export function deleteGuidesFromSystem(guides: GuideOrFolderToDelete[]) {
  return fromPromise(taurpc.guides.deleteGuidesFromSystem(guides), DeleteGuidesInSystemError.from)
}

export function onCopyCurrentGuideStep() {
  return taurpc.guides.copyCurrentGuideStep
}

export class GuideExistsError extends Error {
  static from(error: unknown) {
    return new GuideExistsError('Failed to check if guide exists', { cause: error })
  }
}

export function guideExists(guideId: number) {
  return fromPromise(taurpc.guides.guideExists(guideId), GuideExistsError.from)
}

export class GetRecentGuidesError extends Error {
  static from(error: unknown) {
    return new GetRecentGuidesError('Failed to get recent guides', { cause: error })
  }
}

export function getRecentGuides(profileId: string) {
  return fromPromise(taurpc.guides.getRecentGuides(profileId), GetRecentGuidesError.from)
}

export class RegisterGuideOpenError extends Error {
  static from(error: unknown) {
    return new RegisterGuideOpenError('Failed to register guide open', { cause: error })
  }
}

export function registerGuideOpen(guideId: number, profileId: string) {
  return fromPromise(taurpc.guides.registerGuideOpen(guideId, profileId), RegisterGuideOpenError.from)
}

export class RegisterGuideCloseError extends Error {
  static from(error: unknown) {
    return new RegisterGuideCloseError('Failed to register guide close', { cause: error })
  }
}

export function registerGuideClose(guideId: number, profileId: string) {
  return fromPromise(taurpc.guides.registerGuideClose(guideId, profileId), RegisterGuideCloseError.from)
}

export class RemoveProfileFromRecentGuidesError extends Error {
  static from(error: unknown) {
    return new RemoveProfileFromRecentGuidesError('Failed to remove profile from recent guides', { cause: error })
  }
}

export function removeProfileFromRecentGuides(profileId: string) {
  return fromPromise(taurpc.guides.removeProfileFromRecentGuides(profileId), RemoveProfileFromRecentGuidesError.from)
}
