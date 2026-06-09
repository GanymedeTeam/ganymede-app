import { z } from 'zod'

export const OpenedGuideZod = z.coerce.number()

export type OpenedGuide = z.infer<typeof OpenedGuideZod>

export type OpenedGuideDropPosition = 'before' | 'after'

export function reorderOpenedGuides(
  tabs: OpenedGuide[],
  draggedGuide: OpenedGuide,
  targetGuide: OpenedGuide,
  position: OpenedGuideDropPosition,
) {
  if (draggedGuide === targetGuide) {
    return tabs
  }

  const draggedGuideIndex = tabs.indexOf(draggedGuide)
  const targetGuideIndex = tabs.indexOf(targetGuide)

  if (draggedGuideIndex === -1 || targetGuideIndex === -1) {
    return tabs
  }

  const nextTabs = tabs.filter((guideId) => guideId !== draggedGuide)
  const nextTargetGuideIndex = nextTabs.indexOf(targetGuide)
  const insertionIndex = position === 'before' ? nextTargetGuideIndex : nextTargetGuideIndex + 1

  nextTabs.splice(insertionIndex, 0, draggedGuide)

  return nextTabs.every((guideId, index) => guideId === tabs[index]) ? tabs : nextTabs
}
