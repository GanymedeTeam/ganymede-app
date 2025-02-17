import { Guide, GuideWithSteps } from '@/ipc/bindings.ts'
import { GuideWithStepsWithFolder } from '@/ipc/ipc.ts'
import { clamp } from './clamp.ts'

/**
 * Check if a guide is new compared to another guide.
 *
 * We use updated_at property, this property is a string in ISO 8601 format. Sometime the date may be null
 * @param guide
 * @param otherGuide
 */
export function isGuideNew(
  guide?: Guide | GuideWithSteps | GuideWithStepsWithFolder,
  otherGuide?: Guide | GuideWithSteps | GuideWithStepsWithFolder,
): boolean {
  if (!guide?.updated_at || !otherGuide?.updated_at) {
    return false
  }

  return new Date(guide.updated_at).getTime() !== new Date(otherGuide.updated_at).getTime()
}

export function getGuideById<T extends Guide | GuideWithSteps | GuideWithStepsWithFolder>(
  guides: T[],
  id: number,
): T | undefined {
  return guides.find((guide) => guide.id === id)
}

export function getStepClamped(guides: GuideWithSteps[], guideId: number, step: number): number {
  const guide = getGuideById(guides, guideId)

  if (!guide) {
    return 0
  }

  return clamp(step, 0, guide.steps.length - 1)
}
