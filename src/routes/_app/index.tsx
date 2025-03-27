import { AlmanaxFrame } from '@/components/almanax-frame.tsx'
import { DiscordIcon } from '@/components/icons/discord-icon.tsx'
import { TwitterIcon } from '@/components/icons/twitter-icon.tsx'
import { PageScrollableContent } from '@/components/page-scrollable-content.tsx'
import { PageTitleExtra } from '@/components/page-title.tsx'
import { isProductionQuery } from '@/queries/is_production.query.ts'
import { versionQuery } from '@/queries/version.query.ts'
import { Page } from '@/routes/-page.tsx'
import { Trans, useLingui } from '@lingui/react/macro'
import { useQuery, useSuspenseQuery } from '@tanstack/react-query'
import { createFileRoute } from '@tanstack/react-router'
import { GlobeIcon } from 'lucide-react'

export const Route = createFileRoute('/_app/')({
  component: Index,
})

function Index() {
  const version = useQuery(versionQuery)
  const { t } = useLingui()
  const isProduction = useSuspenseQuery(isProductionQuery)

  return (
    <Page
      title={t`Présentation`}
      actions={
        <PageTitleExtra className="grow text-right" hidden={!version.isSuccess}>
          v{version.data}
          {!isProduction.data && '-dev'}
        </PageTitleExtra>
      }
    >
      <PageScrollableContent className="p-2">
        <div className="app-bg flex grow flex-col gap-1">
          <article className="prose-sm text-xxs xs:text-xs">
            <p>
              <Trans>
                Bienvenue sur <span className="text-orange-300">GANYMÈDE</span> !
              </Trans>
            </p>
            <p>
              <Trans>
                Cet outil a pour but de vous assister tout au long de votre aventure sur{' '}
                <span className="text-green-400">Dofus</span> !
              </Trans>
            </p>
            <p>
              <Trans>
                Vous pouvez créer, utiliser et partager des guides vous permettant d'optimiser votre aventure.
              </Trans>
            </p>
            <p>
              <Trans>Créez vos guides via le site officiel et téléchargez ceux des autres !</Trans>
            </p>
          </article>
          <AlmanaxFrame />
          <div className="flex grow flex-col justify-end gap-1">
            <div className="flex items-center justify-center gap-2">
              <a
                href="https://discord.gg/fxWuXB3dct"
                target="_blank"
                rel="noreferrer noopener"
                className="flex size-9 items-center justify-center"
                title={t`Discord de Ganymède`}
              >
                <DiscordIcon className="size-6" />
              </a>
              <a
                href="https://x.com/GanymedeDofus"
                target="_blank"
                rel="noreferrer noopener"
                className="flex size-9 items-center justify-center"
                title={t`Twitter de Ganymède`}
              >
                <TwitterIcon className="size-4" />
              </a>
              <a
                href="https://ganymede-dofus.com"
                target="_blank"
                rel="noreferrer noopener"
                className="flex size-9 items-center justify-center"
                title={t`Site officiel`}
              >
                <GlobeIcon className="size-5" />
              </a>
            </div>
            <div className="text-center text-xxs">
              <Trans>Ganymède - Non affilié à Ankama Games</Trans>
            </div>
          </div>
        </div>
      </PageScrollableContent>
    </Page>
  )
}
