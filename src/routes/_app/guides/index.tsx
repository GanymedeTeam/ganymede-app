import { FlagPerLang } from '@/components/flag-per-lang'
import { GenericLoader } from '@/components/generic-loader.tsx'
import { GuideDownloadButton } from '@/components/guide-card.tsx'
import { PageScrollableContent } from '@/components/page-scrollable-content'
import { Button } from '@/components/ui/button.tsx'
import { Card } from '@/components/ui/card.tsx'
import { ClearInput } from '@/components/ui/clear-input'
import { useProfile } from '@/hooks/use_profile'
import { GuidesOrFolder } from '@/ipc/bindings.ts'
import { clamp } from '@/lib/clamp.ts'
import { rankList } from '@/lib/rank'
import { OpenedGuideZod } from '@/lib/tabs.ts'
import { useOpenGuidesFolder } from '@/mutations/open-guides-folder.mutation'
import { confQuery } from '@/queries/conf.query.ts'
import { guidesInFolderQuery, guidesQuery } from '@/queries/guides.query.ts'
import { Page } from '@/routes/-page.tsx'
import { Trans, useLingui } from '@lingui/react/macro'
import { useSuspenseQuery } from '@tanstack/react-query'
import { Link, createFileRoute } from '@tanstack/react-router'
import { ChevronRightIcon, FolderIcon, FolderOpenIcon, FolderSyncIcon } from 'lucide-react'
import { useState } from 'react'
import { z } from 'zod'
import { BackButtonLink } from '../downloads/-back-button-link.tsx'

const Search = z.object({
  path: z.string().default(''),
  guides: z.array(OpenedGuideZod).default([]),
  from: OpenedGuideZod.optional(),
})

export const Route = createFileRoute('/_app/guides/')({
  validateSearch: Search.parse,
  component: GuidesPage,
  pendingComponent: Pending,
})

function Pending() {
  const { t } = useLingui()
  const { path, guides, from } = Route.useSearch()

  const comesFromGuide = guides.length > 0 && from

  return (
    <Page
      title={comesFromGuide ? t`Choisissez un guide` : t`Guides`}
      key="guide-page"
      className="slot-[page-title-text]:whitespace-nowrap"
      backButton={path !== '' && <BackButtonLink to="/guides" search={{ path, guides: [] }} disabled />}
      actions={
        <div className="flex w-full items-center justify-end gap-1 text-sm">
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
  const { guides: openedGuides, from } = Route.useSearch({ select: (s) => ({ guides: s.guides, from: s.from }) })
  const { t } = useLingui()
  const conf = useSuspenseQuery(confQuery)
  const profile = useProfile()
  const guides = useSuspenseQuery(guidesInFolderQuery(path))
  const openGuidesFolder = useOpenGuidesFolder()
  const [searchTerm, setSearchTerm] = useState('')
  const allGuides = useSuspenseQuery(guidesQuery(path))

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
          list: allGuides.data.map((g) => {
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
    }
  }

  const onOpenExplorer = () => {
    if (!openGuidesFolder.isPending) {
      openGuidesFolder.mutate()
    }
  }

  const paths = path.split('/')
  const pathsWithoutLast = paths.slice(0, -1)
  const comesFromGuide = openedGuides.length > 0 && from

  return (
    <Page
      key="guide-page"
      className="slot-[page-title-text]:whitespace-nowrap"
      title={comesFromGuide ? t`Choisissez un guide` : t`Guides`}
      backButton={
        path !== '' ? (
          <BackButtonLink to="/guides" search={{ path: pathsWithoutLast.join('/'), guides: openedGuides, from }} />
        ) : (
          comesFromGuide && (
            <BackButtonLink
              to="/guides/$id"
              params={{
                id: from.id,
              }}
              search={{
                step: from.step,
                guides: openedGuides,
              }}
            />
          )
        )
      }
      actions={
        <div className="flex w-full items-center justify-end gap-1 text-sm">
          {guides.isFetched && guides.isFetching && <GenericLoader className="size-4" />}
          <Button
            size="icon-sm"
            variant="secondary"
            onClick={onRefresh}
            title={t`Rafraichir le dossier des guides téléchargés`}
            className="size-6 min-h-6 min-w-6 sm:size-7 sm:min-h-7 sm:min-w-7"
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
                    search={{ path: `${path}/${guide.name}`, guides: openedGuides, from }}
                    draggable={false}
                  >
                    <span className="grow">{guide.name}</span>
                    <FolderIcon className="size-6 focus-visible:bg-white" />
                  </Link>
                </Card>
              )
            }

            const totalSteps = guide.steps.length
            const step = clamp((guide.currentStep ?? 0) + 1, 1, totalSteps)
            const percentage = totalSteps === 1 ? 100 : (((step - 1) / (totalSteps - 1)) * 100).toFixed(1)
            const hasOpenButton = guide.steps.length > 0
            const isOpened = openedGuides.some((g) => g.id === guide.id)

            return (
              <Card
                key={guide.id}
                className="group flex gap-2 p-2 xs:px-3 text-xxs xs:text-sm sm:text-base"
                data-opened={isOpened}
                title={isOpened ? t`Ce guide est déjà ouvert` : undefined}
              >
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
                  <Button asChild variant="secondary" size="icon" disabled={!hasOpenButton || isOpened}>
                    <Link
                      to="/guides/$id"
                      params={{ id: guide.id }}
                      search={{ step: step - 1, guides: [...openedGuides, { id: guide.id, step: step - 1 }] }}
                      draggable={false}
                    >
                      <ChevronRightIcon />
                    </Link>
                  </Button>
                  <GuideDownloadButton guide={guide} />
                </div>
              </Card>
            )
          })}
        </div>
      </PageScrollableContent>
    </Page>
  )
}
