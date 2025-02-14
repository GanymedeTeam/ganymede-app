import { getStep } from '@/lib/progress.ts'
import { progressQuery } from '@/queries/progress.query.ts'
import { useSuspenseQuery } from '@tanstack/react-query'

export function useProgressStep(guideId: number, stepIndex: number) {
  const progress = useSuspenseQuery(progressQuery(guideId))

  return getStep(progress.data, stepIndex) ?? { checkboxes: [] }
}
