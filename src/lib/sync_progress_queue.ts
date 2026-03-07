import { t } from '@lingui/core/macro'
import type { QueryClient } from '@tanstack/react-query'
import { debug } from '@tauri-apps/plugin-log'
import { toast } from 'sonner'
import type { ConfStep } from '@/ipc/bindings.ts'
import { syncProfiles, syncProgress } from '@/ipc/sync.ts'
import { confQuery } from '@/queries/conf.query.ts'

const pendingMap = new Map<string, ReturnType<typeof setTimeout>>()
const pausedMap = new Map<string, () => void>()
const ERROR_TOAST_COOLDOWN_MS = 1000 * 60 * 5
const errorToastShownMap = new Map<string, number>()
const DEBOUNCE_MS = 3000

async function triggerFullSync(toastId: string | number, queryClient: QueryClient) {
  toast.loading(t`Synchronisation en cours…`, { id: toastId })
  const result = await syncProfiles()
  if (result.isOk()) {
    toast.success(t`Synchronisation réussie.`, { id: toastId, action: undefined })
    await queryClient.invalidateQueries(confQuery)
  } else {
    toast.error(t`La synchronisation a échoué.`, { id: toastId, duration: 4000 })
  }
}

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
  errorToastShownMap.clear()

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
  queryClient: QueryClient,
  guideName?: string,
) {
  if (!serverId) return

  const key = `${serverId}:${guideId}`
  const fn = async () => {
    const result = await syncProgress(serverId, guideId, currentStep, steps)
    if (result.isErr()) {
      debug(`[Sync] progress sync failed: ${result.error}`)
      const lastShown = errorToastShownMap.get(key) ?? 0
      if (Date.now() - lastShown > ERROR_TOAST_COOLDOWN_MS) {
        errorToastShownMap.set(key, Date.now())
        const label = guideName ? `"${guideName}" (#${guideId})` : `#${guideId}`
        const cause = result.error.cause
        const isProfileNotFound = cause === 'ProfileOrGuideNotFound'

        if (isProfileNotFound) {
          const id = toast.error(t`Synchro impossible — guide ${label} introuvable sur le serveur.`, {
            duration: Number.POSITIVE_INFINITY,
            action: {
              label: t`Synchro totale`,
              onClick: (e) => {
                e.preventDefault()
                triggerFullSync(id, queryClient)
              },
            },
          })
        } else {
          toast.error(t`La synchronisation de la progression du guide ${label} a échoué.`, { duration: 4000 })
        }
      }
    } else {
      errorToastShownMap.delete(key)
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
