import { type RefObject, useLayoutEffect } from 'react'

export function useScrollToTop(ref: RefObject<HTMLElement | null>, deps: unknown[]) {
  // biome-ignore lint/correctness/useExhaustiveDependencies: ignore
  useLayoutEffect(() => {
    ref.current?.scrollTo(0, 0)
  }, deps)
}
