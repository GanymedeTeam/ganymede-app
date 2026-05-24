import { fromPromise } from 'neverthrow'
import { taurpc } from '@/ipc/ipc.ts'

export class GetStepNotesError extends Error {
  static from(error: unknown) {
    return new GetStepNotesError('Failed to get step notes', { cause: error })
  }
}

export function getStepNotes() {
  return fromPromise(taurpc.stepNotes.get(), GetStepNotesError.from)
}

export class SetStepNoteError extends Error {
  static from(error: unknown) {
    return new SetStepNoteError('Failed to set step note', { cause: error })
  }
}

export function setStepNote(profileId: string, guideId: number, stepIndex: number, note: string | null) {
  return fromPromise(taurpc.stepNotes.setStepNote(profileId, guideId, stepIndex, note), SetStepNoteError.from)
}
