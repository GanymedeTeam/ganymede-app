import { useSuspenseQuery } from '@tanstack/react-query'
import { guidesQuery } from '@/queries/guides.query.ts'

export function useGuide(guideId: number) {
  const guides = useSuspenseQuery(guidesQuery())

  const guide = guides.data.find((guide) => guide.id === guideId)

  if (!guide) {
    throw new Error(`Guide with id ${guideId} not found`)
  }

  return guide
}

export function useGuideOrUndefined(guideId: number) {
  const guides = useSuspenseQuery(guidesQuery())

  return guides.data.find((guide) => guide.id === guideId)
}
