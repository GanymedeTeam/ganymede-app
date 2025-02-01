import { i18n } from '@lingui/core'
import { I18nProvider } from '@lingui/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { RouterProvider, createRouter } from '@tanstack/react-router'
import * as React from 'react'
import ReactDOM from 'react-dom/client'
import { ErrorComponent } from './components/error-component.tsx'
import { dynamicActiveLocale } from './i18n.ts'
import './main.css'
import { getLang } from '@/lib/conf.ts'
import { sentry, setupSentry } from '@/lib/sentry.ts'
import { whiteListQuery } from '@/queries/white_list.query.ts'
import { attachConsole, error } from '@tauri-apps/plugin-log'
import dayjs from 'dayjs'
import timezone from 'dayjs/plugin/timezone'
import utc from 'dayjs/plugin/utc'
import { confQuery } from './queries/conf.query.ts'
import { routeTree } from './routeTree.gen.ts'

dayjs.extend(utc)
dayjs.extend(timezone)

await attachConsole()

setupSentry().catch((err) => {
  error(`Error setting up Sentry: ${err}`)
})

if (
  (window.location.hostname === 'localhost' && window.location.port === '') ||
  (window.location.hostname === 'tauri.localhost' && window.location.port === '')
) {
  document.addEventListener(
    'contextmenu',
    (evt) => {
      evt.preventDefault()

      return false
    },
    { capture: true },
  )

  document.addEventListener(
    'selectstart',
    (evt) => {
      evt.preventDefault()

      return false
    },
    { capture: true },
  )
}

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 0,
      refetchOnMount: true,
    },
  },
})

await dynamicActiveLocale('fr').catch((err) => {
  error(err)
  sentry?.captureException(err, { data: 'Error fetching locale fr' })
})

queryClient
  .ensureQueryData(confQuery)
  .then(async (conf) => {
    window.document.documentElement.style.setProperty('--opacity', `${conf.opacity.toFixed(2)}`)

    await dynamicActiveLocale(getLang(conf.lang).toLowerCase())
  })
  .catch((err) => {
    error(err)
    sentry?.captureException(err, { data: 'Error fetching conf' })
  })

queryClient.prefetchQuery(whiteListQuery).catch((err) => {
  error(err)
  sentry?.captureException(err, { data: 'Error prefetching white list' })
})

// Create a new router instance
const router = createRouter({
  routeTree,
  context: { queryClient },
  defaultErrorComponent: ErrorComponent,
})

// Register the router instance for type safety
declare module '@tanstack/react-router' {
  interface Register {
    router: typeof router
  }
}

try {
  // Render the app
  const rootElement = document.getElementById('root')!
  if (!rootElement.innerHTML) {
    const root = ReactDOM.createRoot(rootElement)

    root.render(
      <React.StrictMode>
        <I18nProvider i18n={i18n}>
          <QueryClientProvider client={queryClient}>
            <RouterProvider router={router} />
          </QueryClientProvider>
        </I18nProvider>
      </React.StrictMode>,
    )
  }
} catch (err) {
  error(`Error rendering the app: ${err}`)
  sentry?.captureException(err, { data: 'Error rendering the app' })
}
