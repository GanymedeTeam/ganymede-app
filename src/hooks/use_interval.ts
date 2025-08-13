import { useSyncExternalStore } from 'react'

function createIntervalStore() {
  let count = 0
  let interval: NodeJS.Timeout | null = null
  const listeners = new Set<() => void>()

  function start() {
    if (interval) return // Déjà actif
    interval = setInterval(() => {
      count += 0.1
      listeners.forEach((listener) => listener())
    }, 100)
  }

  function stop() {
    if (interval) {
      clearInterval(interval)
      interval = null
    }
  }

  function reset() {
    count = 0
    listeners.forEach((listener) => listener()) // Notifie les abonnés
  }

  function subscribe(listener: () => void) {
    listeners.add(listener)
    return () => listeners.delete(listener)
  }

  function getSnapshot() {
    return count
  }

  return { start, stop, reset, subscribe, getSnapshot }
}

const intervalStore = createIntervalStore()

export function useInterval() {
  const seconds = useSyncExternalStore(intervalStore.subscribe, intervalStore.getSnapshot)

  return { seconds, reset: intervalStore.reset, start: intervalStore.start, stop: intervalStore.stop }
}
