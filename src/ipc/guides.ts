import { GuideWithStepsWithFolder, taurpc } from '@/ipc/ipc.ts'
import { error } from '@tauri-apps/plugin-log'
import { ResultAsync, fromPromise } from 'neverthrow'

export class GetGuidesError extends Error {
  static from(error: unknown) {
    console.log(error)
    return new GetGuidesError('Failed to get guides', { cause: error })
  }
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

export class DownloadGuideFromServerError extends Error {
  static from(error: unknown) {
    return new DownloadGuideFromServerError('Failed to download guide', { cause: error })
  }
}

export class OpenGuidesFolderError extends Error {
  static from(error: unknown) {
    return new OpenGuidesFolderError('Failed to open guides folder', { cause: error })
  }
}

export function getGuides(folder?: string) {
  return fromPromise(taurpc.guides.getGuides(folder ?? null), GetGuidesError.from)
}

export function getFlatGuides(folder: string) {
  return fromPromise(taurpc.guides.getFlatGuides(folder), GetFlatGuidesError.from) as ResultAsync<
    GuideWithStepsWithFolder[],
    GetFlatGuidesError
  >
}

export async function downloadGuideFromServer(guideId: number, folder: string) {
  return fromPromise(taurpc.guides.downloadGuideFromServer(guideId, folder), DownloadGuideFromServerError.from)
}

export async function openGuidesFolder() {
  return fromPromise(taurpc.guides.openGuidesFolder(), OpenGuidesFolderError.from)
}
