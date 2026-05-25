import { type RefObject, useLayoutEffect } from 'react'

export function useScrollToTop(ref: RefObject<HTMLElement | null>, deps: unknown[]) {
  // oxlint-disable react/exhaustive-deps -- false positive
  useLayoutEffect(() => {
    ref.current?.scrollTo(0, 0)
  }, deps)
  // oxlint-enable react/exhaustive-deps
}
