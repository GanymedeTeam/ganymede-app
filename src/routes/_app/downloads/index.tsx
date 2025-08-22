import { Trans, useLingui } from '@lingui/react/macro'
import { Slot } from '@radix-ui/react-slot'
import { AnyRouter, createFileRoute, Link, LinkComponentProps, type RegisteredRouter } from '@tanstack/react-router'
import { cva, VariantProps } from 'class-variance-authority'
import { BookOpenIcon, ChevronRightIcon, GlobeIcon, PenToolIcon, TrophyIcon } from 'lucide-react'
import { type PropsWithChildren, ReactNode } from 'react'
import { PageScrollableContent } from '@/components/page_scrollable_content.tsx'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card.tsx'
import { cn } from '@/lib/utils.ts'
import { Page } from '@/routes/-page.tsx'

export const Route = createFileRoute('/_app/downloads/')({
  component: DownloadIndex,
})

const guideCardVariants = cva(
  'group relative flex flex-col rounded-lg hover:bg-linear-to-r focus-visible:bg-linear-to-r transition-colors duration-300',
  {
    variants: {
      variant: {
        gp: 'from-blue-500/10 to-blue-600/10',
        certified: 'from-yellow-500/10 to-yellow-600/10',
        public: 'from-green-500/10 to-green-600/10',
        draft: 'from-slate-500/10 to-slate-600/10',
      },
    },
    defaultVariants: {
      variant: 'gp',
    },
  },
)

const guideCardIndicatorVariants = cva(
  'absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r transform scale-x-0 group-hover:scale-x-100 transition-transform duration-300 origin-left',
  {
    variants: {
      variant: {
        gp: 'from-blue-500/10 to-blue-600/10',
        certified: 'from-yellow-500/10 to-yellow-600/10',
        public: 'from-green-500/10 to-green-600/10',
        draft: 'from-slate-500/10 to-slate-600/10',
      },
    },
    defaultVariants: {
      variant: 'gp',
    },
  },
)

function GuideLinkCard<
  TRouter extends AnyRouter = RegisteredRouter,
  const TFrom extends string = string,
  const TMaskFrom extends string = TFrom,
  const TMaskTo extends string = '',
>({
  children,
  className,
  variant,
  ...props
}: Omit<LinkComponentProps<'a', TRouter, TFrom, '/downloads/$status', TMaskFrom, TMaskTo>, 'to' | 'search'> &
  VariantProps<typeof guideCardVariants>) {
  return (
    <Card asChild className={cn(guideCardVariants({ variant, className }))}>
      <li>
        {/* @ts-expect-error - does not want to know */}
        <Link
          className={cn('relative w-full grow', className)}
          draggable={false}
          to="/downloads/$status"
          search={{ page: 1 }}
          {...props}
        >
          {children}

          <ChevronRightIcon className="-translate-y-1/2 absolute top-1/2 right-3 size-4" />
        </Link>

        <div className={cn(guideCardIndicatorVariants({ variant }))} />
      </li>
    </Card>
  )
}

function GuideLinkCardHeader({ children, icon }: PropsWithChildren<{ icon: ReactNode }>) {
  return (
    <CardHeader className="px-3 xs:px-4 pb-3 xs:pb-3">
      <CardTitle className="flex flex-col items-start gap-3">
        {icon}
        <Trans>{children}</Trans>
      </CardTitle>
    </CardHeader>
  )
}

function GuideLinkCardContent({ children }: PropsWithChildren) {
  return (
    <CardContent className="px-3 xs:px-4 pt-0 xs:pt-0 text-slate-400 xs:text-sm leading-relaxed">
      {children}
    </CardContent>
  )
}

const guideLinkCardVariants = cva('rounded-lg xs:rounded-xl p-1.5 xs:p-2', {
  variants: {
    variant: {
      gp: 'bg-blue-500/20 [&_svg]:text-blue-400',
      certified: 'bg-yellow-500/20 [&_svg]:text-yellow-400',
      public: 'bg-green-500/20 [&_svg]:text-green-400',
      draft: 'bg-slate-500/20 [&_svg]:text-slate-400',
    },
  },
  defaultVariants: {
    variant: 'gp',
  },
})

function GuideLinkCardIcon({ children, variant }: PropsWithChildren<VariantProps<typeof guideLinkCardVariants>>) {
  return (
    <div className={cn(guideLinkCardVariants({ variant }))}>
      <Slot className="size-4 xs:size-6">{children}</Slot>
    </div>
  )
}

function DownloadIndex() {
  const { t } = useLingui()

  return (
    <Page title={t`Catégories`}>
      <PageScrollableContent className="p-3 xs:p-5">
        <ul className="flex flex-col gap-2">
          <GuideLinkCard params={{ status: 'gp' }} variant="gp">
            <GuideLinkCardHeader
              icon={
                <GuideLinkCardIcon variant="gp">
                  <BookOpenIcon />
                </GuideLinkCardIcon>
              }
            >
              <Trans>Guides principaux</Trans>
            </GuideLinkCardHeader>
            <GuideLinkCardContent>
              <Trans>Les guides créés par l'équipe Ganymède</Trans>
            </GuideLinkCardContent>
          </GuideLinkCard>
          <GuideLinkCard params={{ status: 'certified' }} variant="certified">
            <GuideLinkCardHeader
              icon={
                <GuideLinkCardIcon variant="certified">
                  <TrophyIcon />
                </GuideLinkCardIcon>
              }
            >
              <Trans>Guides certifiés</Trans>
            </GuideLinkCardHeader>
            <GuideLinkCardContent>
              <Trans>Les guides de la communauté, validés par l'équipe Ganymède</Trans>
            </GuideLinkCardContent>
          </GuideLinkCard>
          <GuideLinkCard params={{ status: 'public' }} variant="public">
            <GuideLinkCardHeader
              icon={
                <GuideLinkCardIcon variant="public">
                  <GlobeIcon />
                </GuideLinkCardIcon>
              }
            >
              <Trans>Guides publics</Trans>
            </GuideLinkCardHeader>
            <GuideLinkCardContent>
              <Trans>Les guides partagés par la communauté</Trans>
            </GuideLinkCardContent>
          </GuideLinkCard>
          <GuideLinkCard params={{ status: 'draft' }} variant="draft">
            <GuideLinkCardHeader
              icon={
                <GuideLinkCardIcon variant="draft">
                  <PenToolIcon />
                </GuideLinkCardIcon>
              }
            >
              <Trans>Guides draft</Trans>
            </GuideLinkCardHeader>
            <GuideLinkCardContent>
              <Trans>Les guides en cours d'écriture</Trans>
            </GuideLinkCardContent>
          </GuideLinkCard>
        </ul>
      </PageScrollableContent>
    </Page>
  )
}
