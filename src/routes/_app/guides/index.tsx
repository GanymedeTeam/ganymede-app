import { FlagPerLang } from '@/components/flag-per-lang.tsx'
import { GenericLoader } from '@/components/generic-loader.tsx'
import { GuideDownloadButton } from '@/components/guide-download-button.tsx'
import { PageScrollableContent } from '@/components/page-scrollable-content.tsx'
import { Button } from '@/components/ui/button.tsx'
import { Card } from '@/components/ui/card.tsx'
import { ClearInput } from '@/components/ui/clear-input.tsx'
import { useInterval } from '@/hooks/use_interval.ts'
import { useProfile } from '@/hooks/use_profile.ts'
import { GuidesOrFolder } from '@/ipc/bindings.ts'
import { clamp } from '@/lib/clamp.ts'
import { getStepOr } from '@/lib/progress.ts'
import { rankList } from '@/lib/rank.ts'
import { OpenedGuideZod } from '@/lib/tabs.ts'
import { cn } from '@/lib/utils.ts'
import { useOpenGuidesFolder } from '@/mutations/open-guides-folder.mutation.ts'
import { useUpdateAllAtOnce } from '@/mutations/update_all_at_once.mutation.ts'
import { confQuery } from '@/queries/conf.query.ts'
import { guidesInFolderQuery, guidesQuery } from '@/queries/guides.query.ts'
import { hasGuidesNotUpdatedQuery } from '@/queries/has_guides_not_updated.query.ts'
import { Page } from '@/routes/-page.tsx'
import { GuideUpdateAllResultDialog } from '@/routes/_app/guides/-guide-update-all-result-dialog.tsx'
import { Trans, useLingui } from '@lingui/react/macro'
import { useQuery, useQueryClient, useSuspenseQuery } from '@tanstack/react-query'
import { Link, createFileRoute } from '@tanstack/react-router'
import {
  ChevronRightIcon,
  DownloadCloudIcon,
  FolderIcon,
  FolderOpenIcon,
  FolderSyncIcon,
  ImportIcon,
  ServerCrashIcon,
} from 'lucide-react'
import { useState } from 'react'
import { z } from 'zod'
import { BackButtonLink } from '../downloads/-back-button-link.tsx'

const Search = z.object({
  path: z.string().default(''),
  from: OpenedGuideZod.optional(),
})

export const Route = createFileRoute('/_app/guides/')({
  validateSearch: Search.parse,
  component: GuidesPage,
  pendingComponent: Pending,
})

function Pending() {
  const { t } = useLingui()
  const { path, from } = Route.useSearch()

  const comesFromGuide = !!from

  return (
    <Page
      title={comesFromGuide ? t`Choisissez un guide` : t`Guides`}
      key="guide-page"
      className="slot-[page-title-text]:whitespace-nowrap"
      backButton={path !== '' && <BackButtonLink to="/guides" search={{ path }} disabled />}
      actions={
        <div className="flex w-full items-center justify-end gap-1 text-sm">
          <Button size="icon-sm" variant="secondary" className="size-6 min-h-6 min-w-6 sm:size-7 sm:min-h-7 sm:min-w-7">
            <ImportIcon className="size-4" />
          </Button>
          <Button size="icon-sm" variant="secondary" className="size-6 min-h-6 min-w-6 sm:size-7 sm:min-h-7 sm:min-w-7">
            <FolderSyncIcon className="size-4" />
          </Button>
          <Button size="icon-sm" variant="secondary" className="size-6 min-h-6 min-w-6 sm:size-7 sm:min-h-7 sm:min-w-7">
            <FolderOpenIcon className="size-4" />
          </Button>
        </div>
      }
    >
      <PageScrollableContent className="flex items-center justify-center">
        <div className="flex items-center justify-center">
          <GenericLoader />
        </div>
      </PageScrollableContent>
    </Page>
  )
}

function GuidesPage() {
  const path = Route.useSearch({
    select: (search) => (search.path.startsWith('/') ? search.path.slice(1) : search.path),
  })
  const comesFrom = Route.useSearch({
    select: (s) => s.from,
  })
  const queryClient = useQueryClient()
  const { t } = useLingui()
  const conf = useSuspenseQuery(confQuery)
  const profile = useProfile()
  const guides = useSuspenseQuery(guidesInFolderQuery(path))
  const openGuidesFolder = useOpenGuidesFolder()
  const updateAllAtOnce = useUpdateAllAtOnce({
    onMutate: () => {
      interval.start()
    },
    onSettled: () => {
      interval.stop()

      setTimeout(() => {
        interval.reset()
      }, 100)
    },
  })
  const [searchTerm, setSearchTerm] = useState('')
  const allGuidesInPath = useSuspenseQuery(guidesQuery(path))
  const interval = useInterval()

  const guidesWithCurrentProgression = guides.data
    .map((guide) => {
      if (guide.type === 'folder') return guide

      const currentStep = profile.progresses.find((progress) => progress.id === guide.id)?.currentStep ?? null

      return {
        ...guide,
        currentStep,
      } as Extract<GuidesOrFolder, { type: 'guide' }> & { currentStep: number | null }
    })
    .filter((guide) => guide !== null)
  const notDoneGuides = conf.data.showDoneGuides
    ? guidesWithCurrentProgression
    : // Filter out guides that are done (all steps are completed in the profile)
      guidesWithCurrentProgression.filter((guide) => {
        if (guide.type === 'folder') return true

        return guide.currentStep === null || guide.currentStep < guide.steps.length - 1
      })
  const filteredGuides =
    searchTerm !== ''
      ? rankList({
          list: allGuidesInPath.data.map((g) => {
            const currentStep = profile.progresses.find((progress) => progress.id === g.id)?.currentStep ?? null

            return { ...g, currentStep, type: 'guide' } as Omit<Extract<GuidesOrFolder, { type: 'guide' }>, 'type'> & {
              currentStep: number | null
              type: 'guide'
            }
          }),
          keys: [(guide) => guide.name],
          term: searchTerm,
          sortKeys: [(guide) => guide.order],
        })
      : rankList({
          list: notDoneGuides,
          keys: [(guide) => guide.name],
          term: searchTerm,
          sortKeys: [(guide) => (guide.type === 'folder' ? -1 : guide.order)],
        })

  const onRefresh = () => {
    if (!guides.isFetching) {
      guides.refetch()
      queryClient.invalidateQueries(guidesQuery())
      queryClient.invalidateQueries(hasGuidesNotUpdatedQuery)
    }
  }

  const onUpdateAllAtOnce = () => {
    if (!guides.isFetching) {
      updateAllAtOnce.mutate()
    }
  }

  const onOpenExplorer = () => {
    if (!openGuidesFolder.isPending) {
      openGuidesFolder.mutate()
    }
  }

  const paths = path.split('/')
  const pathsWithoutLast = paths.slice(0, -1)
  const comesFromGuide = comesFrom !== undefined

  const updateAllAtOnceGotError =
    updateAllAtOnce.isSuccess && Object.values(updateAllAtOnce.data).some((v) => v !== null)
  const hasSomeGuideNotUpdated = useQuery(hasGuidesNotUpdatedQuery)

  return (
    <Page
      key="guide-page"
      className="slot-[page-title-text]:whitespace-nowrap"
      title={comesFromGuide ? t`Choisissez un guide` : t`Guides`}
      backButton={
        path !== '' ? (
          <BackButtonLink
            to="/guides"
            search={{ path: pathsWithoutLast.join('/'), ...(comesFromGuide ? { from: comesFrom } : {}) }}
          />
        ) : (
          comesFromGuide && (
            <BackButtonLink
              to="/guides/$id"
              params={{ id: comesFrom }}
              search={{ step: getStepOr(profile, comesFrom, 0) }}
            />
          )
        )
      }
      actions={
        <div className="flex w-full items-center justify-end gap-1 text-sm">
          {guides.isFetched && guides.isFetching && <GenericLoader className="size-4" />}
          {updateAllAtOnceGotError && (
            <GuideUpdateAllResultDialog result={updateAllAtOnce.data}>
              <Button
                size="icon-sm"
                variant="destructive"
                title={t`Certains guides n'ont pas été mis à jour`}
                className="size-6 min-h-6 min-w-6 sm:size-7 sm:min-h-7 sm:min-w-7"
                disabled={updateAllAtOnce.isPending || guides.isFetching}
              >
                <ServerCrashIcon className="size-4" />
              </Button>
            </GuideUpdateAllResultDialog>
          )}
          <Button
            size="icon-sm"
            variant="secondary"
            onClick={onUpdateAllAtOnce}
            title={t`Mettre à jour tous les guides`}
            className={cn(
              'size-6 min-h-6 min-w-6 sm:size-7 sm:min-h-7 sm:min-w-7',
              hasSomeGuideNotUpdated.isSuccess && hasSomeGuideNotUpdated.data && 'text-orange-400',
            )}
            disabled={updateAllAtOnce.isPending || guides.isFetching}
          >
            <ImportIcon className="size-4" />
          </Button>
          <Button
            size="icon-sm"
            variant="secondary"
            onClick={onRefresh}
            title={t`Rafraichir le dossier des guides téléchargés`}
            className="size-6 min-h-6 min-w-6 sm:size-7 sm:min-h-7 sm:min-w-7"
            disabled={updateAllAtOnce.isPending || guides.isFetching}
          >
            <FolderSyncIcon className="size-4" />
          </Button>
          <Button
            size="icon-sm"
            variant="secondary"
            onClick={onOpenExplorer}
            title={t`Ouvrir le dossier des guides téléchargés`}
            className="size-6 min-h-6 min-w-6 sm:size-7 sm:min-h-7 sm:min-w-7"
          >
            <FolderOpenIcon className="size-4" />
          </Button>
        </div>
      }
    >
      <PageScrollableContent className="p-2">
        <div className="flex flex-col gap-2">
          {updateAllAtOnce.isPending && (
            <div className="fixed inset-0 top-15 z-10 flex items-center justify-center bg-accent/75">
              <div className="flex items-center gap-2 p-2">
                <GenericLoader className="translate-y-px" />
                <span>
                  <Trans>Mise à jour de vos guides {interval.seconds}s</Trans>
                </span>
              </div>
            </div>
          )}

          <ClearInput
            value={searchTerm}
            onChange={(evt) => setSearchTerm(evt.currentTarget.value)}
            onValueChange={setSearchTerm}
            autoComplete="off"
            autoCorrect="off"
            placeholder={t`Rechercher un guide`}
          />

          {filteredGuides.map((guide) => {
            if (guide.type === 'folder') {
              return (
                <Card key={guide.name} className="flex gap-2 p-2 xs:px-3 text-xxs xs:text-sm sm:text-base" asChild>
                  <Link
                    className="items-center"
                    to="/guides"
                    search={{ path: `${path}/${guide.name}`, ...(comesFromGuide ? { from: comesFrom } : {}) }}
                    draggable={false}
                  >
                    <span className="grow">{guide.name}</span>
                    <FolderIcon className="size-4 xs:size-6 focus-visible:bg-white" />
                  </Link>
                </Card>
              )
            }

            const totalSteps = guide.steps.length
            const step = clamp((guide.currentStep ?? 0) + 1, 1, totalSteps)
            const percentage = totalSteps === 1 ? 100 : (((step - 1) / (totalSteps - 1)) * 100).toFixed(1)
            const hasOpenButton = guide.steps.length > 0

            return (
              <Card key={guide.id} className="flex gap-2 p-2 xs:px-3 text-xxs xs:text-sm sm:text-base">
                <div className="flex min-w-9 flex-col items-center gap-0.5">
                  <FlagPerLang lang={guide.lang} />
                  <span className="whitespace-nowrap text-xxs">
                    <Trans>
                      id <span className="text-yellow-300">{guide.id}</span>
                    </Trans>
                  </span>
                </div>
                <div className="flex grow flex-col gap-1">
                  <h3 className="grow text-balance">{guide.name}</h3>
                  <p className="inline-flex gap-1 self-end">
                    <span>
                      <span className="text-yellow-300">{step}</span>/{totalSteps}
                    </span>
                    <span>({percentage}%)</span>
                  </p>
                </div>
                <div className="flex flex-col items-center gap-1">
                  <Button asChild variant="secondary" size="icon" disabled={!hasOpenButton}>
                    <Link to="/guides/$id" params={{ id: guide.id }} search={{ step: step - 1 }}>
                      <ChevronRightIcon />
                    </Link>
                  </Button>
                  <GuideDownloadButton guide={guide} />
                </div>
              </Card>
            )
          })}

          <Link
            to="/downloads/$status"
            params={{ status: 'gp' }}
            search={{ page: 1 }}
            className="flex flex-col items-center justify-center gap-2 rounded-xl border border-muted-foreground border-dashed px-2 py-3 text-muted-foreground"
          >
            <DownloadCloudIcon />
            <Trans>Télécharger un guide</Trans>
          </Link>
        </div>
      </PageScrollableContent>
    </Page>
  )
}
