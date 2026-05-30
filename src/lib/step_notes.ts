import { StepNote, StepNotes } from '@/ipc/bindings.ts'

export function getStepNote(
  notes: StepNotes,
  profileId: string,
  guideId: number,
  stepIndex: number,
): StepNote | undefined {
  return notes.profiles[profileId]?.guides[guideId]?.steps[stepIndex]
}
