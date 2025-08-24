import { useSyncExternalStore } from 'react'

function isLockedSnapshotFromDialog() {
  const dialog =
    document.body.querySelector('div[role="dialog"]') || document.body.querySelector('div[role="alertdialog"]')

  return document.body.dataset['scroll-locked'] === '1' && dialog?.id?.includes('radix-')
}

/**
 * A custom hook that returns whether the body is locked from dialog interactions.
 */
export function useIsBodyLockedFromDialog() {
  return useSyncExternalStore((onChange) => {
    const observer = new MutationObserver((mutations) => {
      for (const mutation of mutations) {
        const fromBody = mutation.target === document.body
        const fromAttribute = mutation.type === 'attributes'

        if (fromAttribute && fromBody && mutation.attributeName === 'style' && isLockedSnapshotFromDialog()) {
          // this style is added by radix-ui, we want to remove it
          document.body.style.removeProperty('pointer-events')
        }

        if (fromAttribute && fromBody && mutation.attributeName === 'data-scroll-locked') {
          onChange()
        }
      }
    })

    observer.observe(document.body, { attributes: true })

    return () => {
      observer.disconnect()
    }
  }, isLockedSnapshotFromDialog)
}
