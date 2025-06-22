import type * as Sentry from '@sentry/browser'
import { invoke } from '@tauri-apps/api/core'
import { info } from '@tauri-apps/plugin-log'
import { defaultOptions as sentryDefaultOptions } from 'tauri-plugin-sentry-api'

export let sentry: typeof Sentry | undefined

function sendBreadcrumbToRust(breadcrumb: Sentry.Breadcrumb): Sentry.Breadcrumb | null {
  // Ignore IPC breadcrumbs otherwise we'll make an infinite loop
  if (
    typeof breadcrumb.data?.url === 'string' &&
    (breadcrumb.data.url.startsWith('ipc://') ||
      breadcrumb.data.url.startsWith('tauri://') ||
      breadcrumb.data.url.startsWith('http://ipc.localhost'))
  ) {
    return null
  }

  invoke('plugin:sentry|breadcrumb', { breadcrumb })
  // We don't collect breadcrumbs in the renderer since they are passed to Rust
  return null
}

export async function setupSentry() {
  if (import.meta.env.PROD) {
    sentry = await import('@sentry/browser')

    sentry.init({
      ...sentryDefaultOptions,
      autoSessionTracking: false,
      beforeBreadcrumb: sendBreadcrumbToRust,
    })

    await info('Sentry initialized')
  }
}
