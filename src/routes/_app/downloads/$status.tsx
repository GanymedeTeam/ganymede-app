import { t } from '@lingui/core/macro'
import { Trans, useLingui } from '@lingui/react/macro'
import { useSuspenseQuery } from '@tanstack/react-query'
import { createFileRoute } from '@tanstack/react-router'
import { useDebounce } from '@uidotdev/usehooks'
import { useRef, useState } from 'react'
import { z } from 'zod'
import { BottomBar } from '@/components/bottom_bar.tsx'
import { GenericLoader } from '@/components/generic_loader.tsx'
import { PageScrollableContent } from '@/components/page_scrollable_content.tsx'
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert_dialog.tsx'
import { Button } from '@/components/ui/button.tsx'
import { ClearInput } from '@/components/ui/clear_input.tsx'
import {
  Pagination,
  PaginationContent,
  PaginationEllipsis,
  PaginationItem,
  PaginationLink,
} from '@/components/ui/pagination.tsx'
import { useProfile } from '@/hooks/use_profile.ts'
import { useScrollToTop } from '@/hooks/use_scroll_to_top.ts'
import { GameType } from '@/ipc/bindings.ts'
import { getLang } from '@/lib/conf.ts'
import { getGuideById } from '@/lib/guide.ts'
import { getProgress } from '@/lib/progress.ts'
import { rankList } from '@/lib/rank.ts'
import { paginate } from '@/lib/search.ts'
import { confQuery } from '@/queries/conf.query.ts'
import { guidesQuery } from '@/queries/guides.query.ts'
import { guidesFromServerQuery, itemsPerPage } from '@/queries/guides_from_server.query.ts'
import { GuideItem } from '@/routes/_app/guides/-index/guide_item.tsx'
import { Page } from '@/routes/-page.tsx'
import { BackButtonLink } from './-back_button_link.tsx'

const SearchZod = z.object({
  page: z.coerce.number(),
  search: z.string().optional(),
})

const ParamsZod = z.object({
  status: z.enum(['public', 'private', 'draft', 'gp', 'certified']),
})

export const Route = createFileRoute('/_app/downloads/$status')({
  component: DownloadGuidePage,
  params: {
    parse: ParamsZod.parse,
    stringify: (params) => {
      return {
        status: params.status,
      }
    },
  },
  validateSearch: SearchZod.parse,
  loaderDeps: ({ search }) => {
    return {
      page: search.page,
    }
  },
  loader: async ({ context, params }) => {
    await context.queryClient.ensureQueryData(guidesFromServerQuery({ status: params.status }))
  },
  pendingComponent: Pending,
})

function Pending() {
  const status = Route.useParams({ select: (p) => p.status })

  return (
    <Page backButton={<BackButtonLink to="/downloads" />} key={`download-${status}`} title={titleByStatus(status)}>
      <PageScrollableContent className="flex items-center justify-center">
        <div className="flex grow items-center justify-center">
          <GenericLoader />
        </div>
      </PageScrollableContent>
    </Page>
  )
}

function titleByStatus(status: string) {
  switch (status) {
    case 'public':
      return t`Guides publics`
    case 'private':
      return t`Guides privés`
    case 'draft':
      return t`Guides draft`
    case 'gp':
      return t`Guides principaux`
    case 'certified':
      return t`Guides certifiés`
    default:
      return t`Guides`
  }
}

function getPaginationRange(current: number, total: number, delta = 2) {
  const range: (number | '...')[] = []

  const left = Math.max(2, current - delta)
  const right = Math.min(total - 1, current + delta)

  range.push(1)

  if (left > 2) {
    range.push('...')
  }

  for (let i = left; i <= right; i++) {
    range.push(i)
  }

  if (right < total - 1) {
    range.push('...')
  }

  if (total > 1) {
    range.push(total)
  }

  return range
}

function getEmptyStateMessage(gameFilter: GameType | 'all', term: string) {
  if (gameFilter === 'all') {
    return term !== '' ? <Trans>Aucun guides trouvé avec {term}</Trans> : <Trans>Aucun guides trouvé</Trans>
  }

  if (gameFilter === 'dofus') {
    return term !== '' ? <Trans>Aucun guide Dofus trouvé avec {term}</Trans> : <Trans>Aucun guide Dofus trouvé</Trans>
  }

  return term !== '' ? <Trans>Aucun guide Wakfu trouvé avec {term}</Trans> : <Trans>Aucun guide Wakfu trouvé</Trans>
}

function DownloadGuidePage() {
  const { t } = useLingui()
  const baseSearch = Route.useSearch({ select: (s) => s.search })
  const [searchTerm, setSearchTerm] = useState(baseSearch ?? '')
  const [gameFilter, setGameFilter] = useState<GameType | 'all'>('all')
  const page = Route.useSearch({ select: (s) => s.page })
  const status = Route.useParams({ select: (p) => p.status })
  const debouncedTerm = useDebounce(searchTerm, 300)
  const guides = useSuspenseQuery(guidesFromServerQuery({ status }))
  const downloads = useSuspenseQuery(guidesQuery())
  const conf = useSuspenseQuery(confQuery)
  const profile = useProfile()

  const scrollableRef = useRef<HTMLDivElement>(null)

  useScrollToTop(scrollableRef, [page, status])

  const title = titleByStatus(status)
  const nextPages = Math.ceil(guides.data.length / itemsPerPage)

  const term = searchTerm !== '' ? debouncedTerm : ''

  const gameFilteredGuides =
    gameFilter === 'all' ? guides.data : guides.data.filter((g) => (g.game_type ?? 'dofus') === gameFilter)

  const filteredGuides = rankList({
    list: gameFilteredGuides,
    keys: [(guide) => guide.name, (guide) => guide.user.name],
    term: term,
    sortKeys: [(guide) => guide.order],
  })

  // if we are searching, we don't want to paginate
  const paginatedOrFilteredGuides =
    term !== ''
      ? filteredGuides
      : paginate({
          page,
          itemsPerPage,
          items: filteredGuides,
        })

  const hasPagination = term === '' && guides.data.length !== 0 && guides.data.length > itemsPerPage
  const intl = new Intl.NumberFormat(getLang(conf.data.lang).toLowerCase(), {})

  const pages = getPaginationRange(page, nextPages, 3)

  return (
    <Page backButton={<BackButtonLink to="/downloads" />} key={`download-${status}`} title={title}>
      <AlertDialog defaultOpen={status === 'draft' || status === 'public'}>
        <AlertDialogContent className="data-[state=open]:fade-in-100 bg-surface-page">
          <AlertDialogHeader>
            <AlertDialogTitle>
              <Trans>Attention</Trans>
            </AlertDialogTitle>
          </AlertDialogHeader>
          <AlertDialogDescription>
            <Trans>
              Les guides de cette section n'ont pas été vérifiés manuellement par l'équipe Ganymède. <br /> Bien que les
              liens vers les sites soient sécurisés, veuillez vérifier attentivement les guides{' '}
              <strong className="font-semibold">sur notre site</strong> avant de les télécharger.
            </Trans>
          </AlertDialogDescription>
          <AlertDialogFooter>
            <AlertDialogCancel>
              <Trans>J'ai compris</Trans>
            </AlertDialogCancel>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      <PageScrollableContent className="px-2" hasBottomBar={hasPagination} ref={scrollableRef}>
        <div className="flex grow flex-col text-xs sm:text-sm">
          {guides.data.length === 0 ? (
            <p className="text-center">
              <Trans>Aucun guides trouvé</Trans>
            </p>
          ) : (
            <div className="flex flex-col gap-2">
              <div className="-mx-2 mask-gradient-to-top sticky top-0 z-50 flex flex-col gap-2 px-2 py-2 backdrop-blur-sm">
                <ClearInput
                  autoCapitalize="off"
                  autoComplete="off"
                  autoCorrect="off"
                  onChange={(evt) => setSearchTerm(evt.currentTarget.value)}
                  onValueChange={setSearchTerm}
                  placeholder={t`Rechercher un guide`}
                  value={searchTerm}
                />
                <div className="flex gap-1.5">
                  <Button
                    className="flex-1"
                    onClick={() => setGameFilter('all')}
                    size="sm"
                    variant={gameFilter === 'all' ? 'default' : 'outline'}
                  >
                    <Trans>Tous</Trans>
                  </Button>
                  <Button
                    className="flex-1"
                    onClick={() => setGameFilter('dofus')}
                    size="sm"
                    variant={gameFilter === 'dofus' ? 'default' : 'outline'}
                  >
                    Dofus
                  </Button>
                  <Button
                    className="flex-1"
                    onClick={() => setGameFilter('wakfu')}
                    size="sm"
                    variant={gameFilter === 'wakfu' ? 'default' : 'outline'}
                  >
                    Wakfu
                  </Button>
                </div>
              </div>

              {paginatedOrFilteredGuides.length === 0 && (
                <p className="text-center">{getEmptyStateMessage(gameFilter, term)}</p>
              )}

              {paginatedOrFilteredGuides.map((guide) => {
                const isGuideDownloaded = getGuideById(downloads.data, guide.id)

                return (
                  <GuideItem
                    currentStep={getProgress(profile, guide.id)?.currentStep ?? 0}
                    guide={guide}
                    intl={intl}
                    isGuideDownloaded={!!isGuideDownloaded}
                    key={guide.id}
                    variant="server"
                  />
                )
              })}
            </div>
          )}
        </div>
        {hasPagination && (
          <BottomBar asChild>
            <Pagination>
              <PaginationContent>
                {pages.map((paginationPage, idx) => (
                  <PaginationItem key={idx}>
                    {paginationPage === '...' ? (
                      <PaginationEllipsis />
                    ) : (
                      <PaginationLink
                        from={Route.fullPath}
                        params={{ status }}
                        search={{ page: paginationPage }}
                        size="icon"
                        to="."
                      >
                        {paginationPage}
                      </PaginationLink>
                    )}
                  </PaginationItem>
                ))}
              </PaginationContent>
            </Pagination>
          </BottomBar>
        )}
      </PageScrollableContent>
    </Page>
  )
}
