import { PageScrollableContent } from '@/components/page-scrollable-content'
import { Card } from '@/components/ui/card'
import { Page } from '@/routes/-page.tsx'
import { Trans, useLingui } from '@lingui/react/macro'
import { AnyRouter, Link, LinkComponentProps, type RegisteredRouter, createFileRoute } from '@tanstack/react-router'
import { BookOpenCheckIcon, BookOpenTextIcon, NotebookPenIcon, TrophyIcon } from 'lucide-react'
import { type PropsWithChildren } from 'react'
import { cn } from '@/lib/utils'

export const Route = createFileRoute('/_app/downloads/')({
  component: DownloadIndex,
})

function GuideLinkCard({ children }: PropsWithChildren) {
  return (
    <Card asChild className="flex flex-col rounded-lg">
      <li>{children}</li>
    </Card>
  )
}

function GuideLink<
  TRouter extends AnyRouter = RegisteredRouter,
  const TFrom extends string = string,
  const TMaskFrom extends string = TFrom,
  const TMaskTo extends string = '',
>({
  className,
  children,
  ...props
}: Omit<LinkComponentProps<'a', TRouter, TFrom, '/downloads/$status', TMaskFrom, TMaskTo>, 'to' | 'search'>) {
  return (
    // @ts-expect-error - does not want to know
    <Link
      className={cn('flex w-full items-center gap-x-2 p-2 text-sm xs:text-base', className)}
      draggable={false}
      to="/downloads/$status"
      search={{ page: 1 }}
      {...props}
    >
      {children}
    </Link>
  )
}

function DownloadIndex() {
  const { t } = useLingui()

  return (
    <Page title={t`Catégories`}>
      <PageScrollableContent className="p-2">
        <ul className="flex flex-col gap-2">
          <GuideLinkCard>
            <GuideLink params={{ status: 'gp' }}>
              <span>
                <BookOpenTextIcon className="size-5" />
              </span>
              <span>
                <Trans>Guides principaux</Trans>
              </span>
            </GuideLink>
          </GuideLinkCard>
          <GuideLinkCard>
            <GuideLink params={{ status: 'certified' }}>
              <span>
                <TrophyIcon className="size-5" />
              </span>
              <span>
                <Trans>Guides certifiés</Trans>
              </span>
            </GuideLink>
          </GuideLinkCard>
          <GuideLinkCard>
            <GuideLink params={{ status: 'public' }}>
              <span>
                <BookOpenCheckIcon className="size-5" />
              </span>
              <span>
                <Trans>Guides publics</Trans>
              </span>
            </GuideLink>
          </GuideLinkCard>
          <GuideLinkCard>
            <GuideLink params={{ status: 'draft' }}>
              <span>
                <NotebookPenIcon className="size-5" />
              </span>
              <span>
                <Trans>Guides draft</Trans>
              </span>
            </GuideLink>
          </GuideLinkCard>
        </ul>
      </PageScrollableContent>
    </Page>
  )
}
