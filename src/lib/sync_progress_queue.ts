import { debug } from '@tauri-apps/plugin-log'
import type { ConfStep } from '@/ipc/bindings.ts'
import { syncProgress } from '@/ipc/sync.ts'

const pendingMap = new Map<string, ReturnType<typeof setTimeout>>()
const pausedMap = new Map<string, () => void>()
const DEBOUNCE_MS = 3000

function scheduleSync(key: string, fn: () => void) {
  clearTimeout(pendingMap.get(key))
  pendingMap.set(
    key,
    setTimeout(() => {
      pendingMap.delete(key)
      fn()
    }, DEBOUNCE_MS),
  )
}

function flushPaused() {
  for (const [key, fn] of pausedMap) {
    pausedMap.delete(key)
    fn()
  }
}

window.addEventListener('online', flushPaused)

export function queueProgressSync(
  serverId: number | null | undefined,
  guideId: number,
  currentStep: number,
  steps: Partial<{ [key in number]: ConfStep }>,
) {
  if (!serverId) return

  const key = `${serverId}:${guideId}`
  const fn = async () => {
    const result = await syncProgress(serverId, guideId, currentStep, steps)
    if (result.isErr()) {
      debug(`[Sync] progress sync failed: ${result.error}`)
    }
  }

  if (!navigator.onLine) {
    clearTimeout(pendingMap.get(key))
    pendingMap.delete(key)
    pausedMap.set(key, fn)
    return
  }

  scheduleSync(key, fn)
}
