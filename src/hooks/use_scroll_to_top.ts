import { type RefObject, useLayoutEffect } from 'react'

export function useScrollToTop(ref: RefObject<HTMLElement | null>, deps: unknown[]) {
  useLayoutEffect(() => {
    ref.current?.scrollTo(0, 0)
    // biome-ignore lint/correctness/useExhaustiveDependencies: false positive
  }, deps)
}
