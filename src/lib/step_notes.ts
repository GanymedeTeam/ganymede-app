import { StepNotes } from '@/ipc/bindings.ts'

export function getStepNote(
  notes: StepNotes,
  profileId: string,
  guideId: number,
  stepIndex: number,
): string | undefined {
  return notes.profiles[profileId]?.guides[guideId]?.steps[stepIndex]
}
