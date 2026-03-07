import { debug } from '@tauri-apps/plugin-log'
import { fromPromise } from 'neverthrow'
import type { ConfStep } from '@/ipc/bindings.ts'
import { taurpc } from '@/ipc/ipc.ts'

export class SyncProfilesError extends Error {
  static from(error: unknown) {
    debug('[Sync] syncProfiles error: ' + JSON.stringify(error))
    return new SyncProfilesError('Failed to sync profiles', { cause: error })
  }
}

export function syncProfiles() {
  return fromPromise(taurpc.sync.syncProfiles(), SyncProfilesError.from)
}

export class CreateProfileRemoteError extends Error {
  static from(error: unknown) {
    debug('[Sync] createProfile error: ' + JSON.stringify(error))
    return new CreateProfileRemoteError('Failed to create remote profile', { cause: error })
  }
}

export function createProfileRemote(name: string, uuid: string) {
  return fromPromise(taurpc.sync.createProfile(name, uuid), CreateProfileRemoteError.from)
}

export class RenameProfileRemoteError extends Error {
  static from(error: unknown) {
    debug('[Sync] renameProfile error: ' + JSON.stringify(error))
    return new RenameProfileRemoteError('Failed to rename remote profile', { cause: error })
  }
}

export function renameProfileRemote(serverId: number, name: string) {
  return fromPromise(taurpc.sync.renameProfile(serverId, name), RenameProfileRemoteError.from)
}

export class DeleteProfileRemoteError extends Error {
  static from(error: unknown) {
    debug('[Sync] deleteProfile error: ' + JSON.stringify(error))
    return new DeleteProfileRemoteError('Failed to delete remote profile', { cause: error })
  }
}

export function deleteProfileRemote(serverId: number) {
  return fromPromise(taurpc.sync.deleteProfile(serverId), DeleteProfileRemoteError.from)
}

export class SyncProgressError extends Error {
  static from(error: unknown) {
    debug('[Sync] syncProgress error: ' + JSON.stringify(error))
    return new SyncProgressError('Failed to sync progress', { cause: error })
  }
}

export function syncProgress(
  serverId: number,
  guideId: number,
  currentStep: number,
  steps: Partial<{ [key in number]: ConfStep }>,
) {
  return fromPromise(taurpc.sync.syncProgress(serverId, guideId, currentStep, steps), SyncProgressError.from)
}
