import { ConfStep, Profile, Progress } from '@/ipc/bindings.ts'

export function newProgress(guideId: number): Progress {
  return {
    id: guideId,
    currentStep: 0,
    steps: {},
    updatedAt: new Date().toISOString(),
  }
}

export function getProgress(profile: Profile, guideId: number): Progress | undefined {
  return profile.progresses.find((p) => p.id === guideId)
}

export function getStep(progress: Progress, stepIndex: number): ConfStep | undefined {
  return progress.steps[stepIndex]
}

export function getStepOr(profile: Profile, guideId: number, or: number): number {
  return getProgress(profile, guideId)?.currentStep ?? or
}

export function getProgressConfStep(profile: Profile, guideId: number, stepIndex: number): ConfStep {
  const progress = getProgress(profile, guideId)

  if (!progress) return { checkboxes: [] }

  return getStep(progress, stepIndex) ?? { checkboxes: [] }
}
