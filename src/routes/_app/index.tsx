import { Trans, useLingui } from '@lingui/react/macro';
import { useQuery, useSuspenseQuery } from '@tanstack/react-query';
import { createFileRoute, Link } from '@tanstack/react-router';
import { ExternalLinkIcon } from 'lucide-react';
import { openUrl } from '@tauri-apps/plugin-opener';
import { AlmanaxCard } from '@/components/almanax_card.tsx';
import { DiscordIcon } from '@/components/icons/discord_icon.tsx';
import { TwitterIcon } from '@/components/icons/twitter_icon.tsx';
import { PageScrollableContent } from '@/components/page_scrollable_content.tsx';
import { PageTitleExtra } from '@/components/page_title.tsx';
import { GANYMEDE_HOST } from '@/lib/api.ts';
import { isProductionQuery } from '@/queries/is_production.query.ts';
import { versionQuery } from '@/queries/version.query.ts';
import { Page } from '@/routes/-page.tsx';

export const Route = createFileRoute('/_app/')({
  component: Index,
});

function Index() {
  const version = useQuery(versionQuery);
  const { t } = useLingui();
  const isProduction = useSuspenseQuery(isProductionQuery);

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
        <div className="app-bg flex grow flex-col gap-3">
          {/* Welcome Card */}
          <WelcomeCard />

          {/* Almanax Card */}
          <AlmanaxCard />

          {/* Footer */}
          <Footer />
        </div>
      </PageScrollableContent>
    </Page>
  );
}

function WelcomeCard() {
  const { t } = useLingui();

  const handleOpenCreateGuide = () => {
    openUrl(`https://${GANYMEDE_HOST}/guides`);
  };

  return (
    <div className="flex flex-col gap-3 p-4 bg-surface-card rounded-xl border border-border-muted shadow-[0_5px_14px_rgba(0,0,0,0.5)]">
      {/* Title */}
      <div className="flex items-center justify-between">
        <h2 className="font-bold text-base xs:text-lg bg-gradient-to-r from-accent-light via-accent to-accent-dark bg-clip-text text-transparent">
          GANYMÈDE
        </h2>
        <span className="text-xxs text-muted-foreground">
          <Trans>Companion Dofus</Trans>
        </span>
      </div>

      {/* Description */}
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

      {/* CTA Buttons */}
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
          onClick={handleOpenCreateGuide}
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

function Footer() {
  const { t } = useLingui();

  const handleOpenDiscord = () => {
    openUrl('https://discord.gg/fxWuXB3dct');
  };

  const handleOpenTwitter = () => {
    openUrl('https://x.com/GanymedeDofus');
  };

  const handleOpenWebsite = () => {
    openUrl(`https://${GANYMEDE_HOST}`);
  };

  return (
    <div className="flex flex-col gap-3 mt-auto pt-2">
      {/* Social Links */}
      <div className="flex items-center justify-center gap-1">
        <button
          type="button"
          onClick={handleOpenDiscord}
          className="flex size-10 items-center justify-center rounded-lg bg-surface-card border border-border-muted hover:bg-surface-inset/70 transition-colors cursor-pointer"
          title={t`Discord de Ganymède`}
        >
          <DiscordIcon className="size-5 text-accent" />
        </button>
        <button
          type="button"
          onClick={handleOpenTwitter}
          className="flex size-10 items-center justify-center rounded-lg bg-surface-card border border-border-muted hover:bg-surface-inset/70 transition-colors cursor-pointer"
          title={t`Twitter de Ganymède`}
        >
          <TwitterIcon className="size-4 text-accent" />
        </button>
        <button
          type="button"
          onClick={handleOpenWebsite}
          className="flex size-10 items-center justify-center rounded-lg bg-surface-card border border-border-muted hover:bg-surface-inset/70 transition-colors cursor-pointer"
          title={t`Site officiel`}
        >
          <ExternalLinkIcon className="size-4 text-accent" />
        </button>
      </div>

      {/* Disclaimer */}
      <p className="text-center text-xxs text-muted-foreground">
        <Trans>Ganymède - Non affilié à Ankama Games</Trans>
      </p>
    </div>
  );
}
