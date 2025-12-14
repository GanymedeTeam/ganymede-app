import { Trans, useLingui } from '@lingui/react/macro';
import { createFileRoute, Link } from '@tanstack/react-router';
import { cva, VariantProps } from 'class-variance-authority';
import { BookOpenIcon, GlobeIcon, PenToolIcon, TrophyIcon } from 'lucide-react';
import { ReactNode } from 'react';
import { PageScrollableContent } from '@/components/page_scrollable_content.tsx';
import { cn } from '@/lib/utils.ts';
import { Page } from '@/routes/-page.tsx';

export const Route = createFileRoute('/_app/downloads/')({
  component: DownloadIndex,
});

// Card icon styles per variant
const iconContainerVariants = cva('rounded-xl p-2.5', {
  variants: {
    variant: {
      gp: 'bg-blue-500/20',
      certified: 'bg-amber-500/20',
      public: 'bg-emerald-500/20',
      draft: 'bg-slate-500/20',
    },
  },
  defaultVariants: {
    variant: 'gp',
  },
});

const iconVariants = cva('size-6', {
  variants: {
    variant: {
      gp: 'text-blue-400',
      certified: 'text-amber-400',
      public: 'text-emerald-400',
      draft: 'text-slate-400',
    },
  },
  defaultVariants: {
    variant: 'gp',
  },
});

// Chevron gold gradient
function GoldChevron() {
  return (
    <>
      <svg width="0" height="0" className="absolute">
        <defs>
          <linearGradient id="goldGradientChevron" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="var(--color-accent-light, #fceaa8)" />
            <stop offset="50%" stopColor="var(--color-accent-DEFAULT, #e7c272)" />
            <stop offset="100%" stopColor="var(--color-accent-dark, #D7B363)" />
          </linearGradient>
        </defs>
      </svg>
      <svg
        viewBox="0 0 24 24"
        className="size-6"
        fill="none"
        stroke="url(#goldGradientChevron)"
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="m9 18 6-6-6-6" />
      </svg>
    </>
  );
}

interface CategoryCardProps extends VariantProps<typeof iconContainerVariants> {
  status: 'gp' | 'certified' | 'public' | 'private' | 'draft';
  icon: ReactNode;
  title: ReactNode;
  description: ReactNode;
}

function CategoryCard({ status, icon, title, description, variant }: CategoryCardProps) {
  return (
    <Link
      to="/downloads/$status"
      params={{ status }}
      search={{ page: 1 }}
      className="flex items-center gap-4 p-4 bg-surface-card rounded-xl border border-border-muted shadow-[0_5px_14px_rgba(0,0,0,0.5)] hover:bg-surface-inset/70 transition-colors"
      draggable={false}
    >
      {/* Icon */}
      <div className={cn(iconContainerVariants({ variant }))}>
        <div className={cn(iconVariants({ variant }))}>
          {icon}
        </div>
      </div>

      {/* Content */}
      <div className="flex flex-col gap-1 min-w-0 flex-1">
        <h3 className="font-semibold text-sm leading-tight">
          {title}
        </h3>
        <p className="text-xs text-muted-foreground leading-relaxed">
          {description}
        </p>
      </div>

      {/* Chevron */}
      <div className="flex items-center shrink-0">
        <GoldChevron />
      </div>
    </Link>
  );
}

function DownloadIndex() {
  const { t } = useLingui();

  return (
    <Page title={t`Catégories`}>
      <PageScrollableContent className="p-3">
        <div className="flex flex-col gap-2">
          <CategoryCard
            status="gp"
            variant="gp"
            icon={<BookOpenIcon />}
            title={<Trans>Guides principaux</Trans>}
            description={<Trans>Les guides créés par l'équipe Ganymède</Trans>}
          />

          <CategoryCard
            status="certified"
            variant="certified"
            icon={<TrophyIcon />}
            title={<Trans>Guides certifiés</Trans>}
            description={<Trans>Les guides de la communauté, validés par l'équipe Ganymède</Trans>}
          />

          <CategoryCard
            status="public"
            variant="public"
            icon={<GlobeIcon />}
            title={<Trans>Guides publics</Trans>}
            description={<Trans>Les guides partagés par la communauté</Trans>}
          />

          <CategoryCard
            status="draft"
            variant="draft"
            icon={<PenToolIcon />}
            title={<Trans>Guides draft</Trans>}
            description={<Trans>Les guides en cours d'écriture</Trans>}
          />
        </div>
      </PageScrollableContent>
    </Page>
  );
}
