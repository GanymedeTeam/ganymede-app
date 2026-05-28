import { type RefObject, useLayoutEffect } from 'react'

export function useScrollToTop(ref: RefObject<HTMLElement | null>, deps: unknown[]) {
  useLayoutEffect(() => {
    ref.current?.scrollTo(0, 0)
    // oxlint-disable-next-line react-hooks/exhaustive-deps -- false positive
  }, deps)
}
