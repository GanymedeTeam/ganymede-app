import { Trans, useLingui } from '@lingui/react/macro'
import { Link } from '@tanstack/react-router'
import { ExternalLinkIcon } from 'lucide-react'

import { GANYMEDE_HOST } from '@/lib/api.ts'
import { useOpenUrlInBrowser } from '@/mutations/open_url_in_browser.ts'

export function WelcomeCard() {
  const { t } = useLingui()
  const openUrlInBrowser = useOpenUrlInBrowser()

  return (
    <div className="flex flex-col gap-3 rounded-xl border border-border-muted bg-surface-card p-4 shadow-[0_5px_14px_rgba(0,0,0,0.5)]">
      <div className="flex flex-col gap-0.5 xs:flex-row xs:items-center xs:justify-between">
        <h2 className="bg-gradient-to-r from-accent-light via-accent to-accent-dark bg-clip-text text-base font-bold text-transparent xs:text-lg">
          GANYMÈDE
        </h2>
        <span className="text-xxs text-muted-foreground">
          <Trans>Companion Dofus</Trans>
        </span>
      </div>

      <div className="flex flex-col gap-2 text-xs leading-relaxed text-muted-foreground xs:text-sm">
        <p>
          <Trans>
            Bienvenue sur <span className="font-semibold text-accent">GANYMÈDE</span> !
          </Trans>
        </p>
        <p>
          <Trans>
            Cet outil a pour but de vous assister tout au long de votre aventure sur{' '}
            <span className="font-semibold text-success">Dofus</span> !
          </Trans>
        </p>
        <p>
          <Trans>Vous pouvez créer, utiliser et partager des guides vous permettant d'optimiser votre aventure.</Trans>
        </p>
        <p>
          <Trans>Créez vos guides via le site officiel et téléchargez ceux des autres !</Trans>
        </p>
      </div>

      <div className="flex flex-col gap-2">
        <Link
          className="flex flex-1 items-center justify-center gap-2 rounded-lg border border-border-muted bg-surface-inset px-4 py-2.5 text-sm font-semibold text-foreground transition-colors hover:bg-surface-inset/70"
          params={{ status: 'gp' }}
          search={{ page: 1 }}
          to="/downloads/$status"
        >
          <Trans>Voir les guides</Trans>
        </Link>
        <button
          className="flex flex-1 cursor-pointer items-center justify-center gap-2 rounded-lg bg-gradient-to-r from-accent-light via-accent to-accent-dark px-4 py-2.5 text-sm font-semibold text-accent-foreground transition-opacity hover:opacity-90"
          onClick={() => openUrlInBrowser.mutate(`https://${GANYMEDE_HOST}/guides`)}
          title={t`Accéder au site officiel`}
          type="button"
        >
          <Trans>Créer un guide</Trans>
          <ExternalLinkIcon className="size-4" />
        </button>
      </div>
    </div>
  )
}
