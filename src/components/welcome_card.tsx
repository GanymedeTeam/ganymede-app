import { Trans, useLingui } from '@lingui/react/macro';
import { Link } from '@tanstack/react-router';
import { ExternalLinkIcon } from 'lucide-react';
import { openUrl } from '@tauri-apps/plugin-opener';
import { GANYMEDE_HOST } from '@/lib/api.ts';

export function WelcomeCard() {
    const { t } = useLingui();

    return (
        <div className="flex flex-col gap-3 p-4 bg-surface-card rounded-xl border border-border-muted shadow-[0_5px_14px_rgba(0,0,0,0.5)]">
            <div className="flex flex-col xs:flex-row xs:items-center xs:justify-between gap-0.5">
                <h2 className="font-bold text-base xs:text-lg bg-gradient-to-r from-accent-light via-accent to-accent-dark bg-clip-text text-transparent">
                    GANYMÈDE
                </h2>
                <span className="text-xxs text-muted-foreground">
                    <Trans>Companion Dofus</Trans>
                </span>
            </div>

            <div className="flex flex-col gap-2 text-xs xs:text-sm text-muted-foreground leading-relaxed">
                <p>
                    <Trans>
                        Bienvenue sur <span className="text-accent font-semibold">GANYMÈDE</span> !
                    </Trans>
                </p>
                <p>
                    <Trans>
                        Cet outil a pour but de vous assister tout au long de votre aventure sur{' '}
                        <span className="text-success font-semibold">Dofus</span> !
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
            </div>

            <div className="flex flex-col gap-2">
                <Link
                    to="/downloads/$status"
                    params={{ status: 'gp' }}
                    search={{ page: 1 }}
                    className="flex flex-1 items-center justify-center gap-2 px-4 py-2.5 bg-surface-inset border border-border-muted text-foreground font-semibold text-sm rounded-lg hover:bg-surface-inset/70 transition-colors"
                >
                    <Trans>Voir les guides</Trans>
                </Link>
                <button
                    type="button"
                    onClick={() => openUrl(`https://${GANYMEDE_HOST}/guides`)}
                    className="flex flex-1 items-center justify-center gap-2 px-4 py-2.5 bg-gradient-to-r from-accent-light via-accent to-accent-dark text-accent-foreground font-semibold text-sm rounded-lg hover:opacity-90 transition-opacity cursor-pointer"
                    title={t`Accéder au site officiel`}
                >
                    <Trans>Créer un guide</Trans>
                    <ExternalLinkIcon className="size-4" />
                </button>
            </div>
        </div>
    );
}
