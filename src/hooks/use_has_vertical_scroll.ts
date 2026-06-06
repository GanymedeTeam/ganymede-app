import debounce from 'debounce-fn'
import { useCallback, useSyncExternalStore } from 'react'

export function useHasVerticalScroll(element: HTMLElement | null) {
  const subscribe = useCallback(
    (onStoreChange: () => void) => {
      if (!element) {
        return () => {
          // noop
        }
      }

      const onResize = debounce(onStoreChange, { wait: 500 })

      window.addEventListener('resize', onResize)

      let observer: MutationObserver | null = null

      if (element) {
        observer = new MutationObserver(onStoreChange)
        observer.observe(element, { attributes: true, childList: true, subtree: true })
      }

      return () => {
        window.removeEventListener('resize', onResize)

        observer?.disconnect()
      }
    },
    [element],
  )

  const getSnapshot = useCallback(() => {
    if (!element) {
      return false
    }

    return element.scrollHeight > element.clientHeight
  }, [element])

  return useSyncExternalStore(subscribe, getSnapshot)
}
