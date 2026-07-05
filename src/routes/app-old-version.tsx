import { Trans } from '@lingui/react/macro'
import { useSuspenseQuery } from '@tanstack/react-query'
import { createFileRoute } from '@tanstack/react-router'
import { platform } from '@tauri-apps/plugin-os'
import { ExternalLinkIcon } from 'lucide-react'
import { useEffect, useState } from 'react'
import { z } from 'zod'

import { PageScrollableContent } from '@/components/page_scrollable_content.tsx'
import { Button } from '@/components/ui/button.tsx'
import { Progress } from '@/components/ui/progress.tsx'
import { useWebviewEvent } from '@/hooks/use_webview_event.ts'
import { ConfLang } from '@/ipc/bindings.ts'
import { clamp } from '@/lib/clamp.ts'
import { getLang } from '@/lib/conf.ts'
import { cn } from '@/lib/utils.ts'
import { useOpenUrlInBrowser } from '@/mutations/open_url_in_browser.ts'
import { useStartUpdate } from '@/mutations/start_update.mutation.ts'
import { confQuery } from '@/queries/conf.query.ts'

const SearchZod = z.object({
  fromVersion: z.string(),
  toVersion: z.string(),
})

export const Route = createFileRoute('/app-old-version')({
  validateSearch: SearchZod.parse,
  component: AppOldVersionPage,
})

type UpdateState = 'idle' | 'downloading' | 'finished' | 'error'

const discordChannels: Record<ConfLang, string> = {
  Fr: 'https://discord.com/channels/1243967153590501437/1269278260269682850',
  En: 'https://discord.com/channels/1243967153590501437/1303090961789751336',
  Pt: 'https://discord.com/channels/1243967153590501437/1303090961789751336', // currently using the english channel
  Es: 'https://discord.com/channels/1243967153590501437/1303090961789751336', // currently using the english channel
}

const downloadAnchorByPlatform: Partial<Record<ReturnType<typeof platform>, string>> = {
  macos: 'install-mac',
  windows: 'auto-install-windows',
  linux: 'install-ubuntu',
}

function getManualDownloadUrl() {
  const anchor = downloadAnchorByPlatform[platform()]

  return anchor ? `https://ganymede-app.com/download#${anchor}` : 'https://ganymede-app.com/download'
}

function AppOldVersionPage() {
  const { fromVersion, toVersion } = Route.useSearch()
  const [downloaded, setDownloaded] = useState<number | null>(null)
  const [total, setTotal] = useState<number | null>(null)
  const [updateState, setUpdateState] = useState<UpdateState>('idle')
  const startUpdate = useStartUpdate()
  const openUrlInBrowser = useOpenUrlInBrowser()
  const conf = useSuspenseQuery(confQuery)

  const progress = clamp(downloaded && total ? (downloaded / total) * 100 : 0, 4, 100)

  useWebviewEvent('update-started', () => {
    setUpdateState('downloading')
  })

  useWebviewEvent('update-in-progress', (evt) => {
    const [downloaded, content] = evt.payload

    setDownloaded(downloaded)
    setTotal(content)
  })

  useWebviewEvent('update-finished', () => {
    setUpdateState('finished')
  })

  useWebviewEvent('update-error', () => {
    setUpdateState('error')
  })

  // The download/install can fail on the Rust side (e.g. unsigned app blocked by
  // the OS): surface it instead of leaving the UI stuck on "will restart".
  useEffect(() => {
    if (startUpdate.isError) {
      setUpdateState('error')
    }
  }, [startUpdate.isError])

  return (
    <PageScrollableContent className="flex grow flex-col justify-center gap-4 p-4 text-sm">
      <p className={cn('text-balance', updateState === 'finished' && 'text-slate-600')}>
        <Trans>
          Vous ne disposez pas de la dernière version de{' '}
          <span className={cn('text-yellow-200', updateState === 'finished' && 'text-current')}>Ganymède</span>.
        </Trans>
      </p>
      {updateState === 'idle' && (
        <p className="text-balance">
          <Trans>
            Vous utilisez actuellement la version <span className="text-yellow-200">{fromVersion}</span>.
          </Trans>
        </p>
      )}

      {updateState === 'idle' && (
        <a
          className="group leading-5 text-slate-300"
          draggable={false}
          href={discordChannels[getLang(conf.data.lang)]}
          rel="noreferrer noopener"
          target="_blank"
        >
          <Trans>
            <span>
              Vous trouverez les notes de version sur notre Discord{' '}
              <span className="text-yellow-100 group-hover:underline">#changelog</span>
            </span>
          </Trans>
          <ExternalLinkIcon className="ml-1 inline-block size-4 text-yellow-100 group-hover:underline" />.
        </a>
      )}

      {updateState === 'downloading' ? (
        <>
          <p>
            <Trans>Mise à jour en cours.</Trans>
          </p>
          <Progress max={100} value={progress} />
        </>
      ) : updateState === 'finished' ? (
        <p>
          <Trans>Installation en cours…</Trans>
        </p>
      ) : updateState === 'error' ? (
        <div className="flex flex-col gap-3">
          <p className="text-balance text-red-300">
            <Trans>
              La mise à jour automatique a échoué. Téléchargez et installez manuellement la dernière version.
            </Trans>
          </p>
          <Button onClick={() => openUrlInBrowser.mutate(getManualDownloadUrl())} size="lg">
            <Trans>Télécharger la version {toVersion}</Trans>
            <ExternalLinkIcon className="ml-1 inline-block size-4" />
          </Button>
        </div>
      ) : (
        <Button
          disabled={startUpdate.isPending || startUpdate.isSuccess}
          onClick={() => {
            setUpdateState('downloading')
            startUpdate.mutate()
          }}
          size="lg"
        >
          <Trans>Télécharger la version {toVersion}</Trans>
        </Button>
      )}
    </PageScrollableContent>
  )
}
