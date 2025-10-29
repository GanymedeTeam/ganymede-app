import { Trans, useLingui } from '@lingui/react/macro'
import { useSuspenseQuery } from '@tanstack/react-query'
import { createFileRoute, Link } from '@tanstack/react-router'
import { DownloadCloudIcon, MenuIcon } from 'lucide-react'
import { useState } from 'react'
import { z } from 'zod'
import { GenericLoader } from '@/components/generic_loader.tsx'
import { PageScrollableContent } from '@/components/page_scrollable_content.tsx'
import { Button } from '@/components/ui/button.tsx'
import { ClearInput } from '@/components/ui/clear_input.tsx'
import { useProfile } from '@/hooks/use_profile.ts'
import { GameType, GuidesOrFolder } from '@/ipc/bindings.ts'
import { GuideWithStepsWithFolder } from '@/ipc/ipc.ts'
import { getStepOr } from '@/lib/progress.ts'
import { rankList } from '@/lib/rank.ts'
import { OpenedGuideZod } from '@/lib/tabs.ts'
import { confQuery } from '@/queries/conf.query.ts'
import { guidesInFolderQuery, guidesQuery } from '@/queries/guides.query.ts'
import { Page } from '@/routes/-page.tsx'
import { BackButtonLink } from '../downloads/-back_button_link.tsx'
import { ActionsToolbar } from './-index/actions_toolbar.tsx'
import { FolderItem } from './-index/folder_item.tsx'
import { GuideItem } from './-index/guide_item.tsx'
import { SelectionToolbar } from './-index/selection_toolbar.tsx'

const Search = z.object({
  path: z.string().default(''),
  from: OpenedGuideZod.optional(),
})

export const Route = createFileRoute('/_app/guides/')({
  validateSearch: Search.parse,
  component: GuidesPage,
  pendingComponent: Pending,
})

/**
 * @param path folder path in the system
 */
function createPagePath(path: string) {
  const paths = path.split('/')

  if (paths.length === 0) return ''
  if (paths.length <= 3) {
    return paths
      .map((segment, index) =>
        index < paths.length - 1 && segment.length > 10 ? `${segment.slice(0, 10)}...` : segment,
      )
      .join('/')
  }

  const lastPaths = paths.slice(-2).map((segment, index, array) => {
    if (index === array.length - 1 && segment.length > 15) {
      return `${segment.slice(0, 15)}...`
    }
    return segment.length > 10 ? `${segment.slice(0, 10)}...` : segment
  })

  return `.../${lastPaths.join('/')}`
}

function Pending() {
  const { t } = useLingui()
  const { path, from } = Route.useSearch()

  const comesFromGuide = !!from

  return (
    <Page
      title={comesFromGuide ? t`Choisissez un guide` : t`Guides ${createPagePath(path)}`}
      key="guide-page"
      className="slot-[page-title-text]:whitespace-nowrap"
      backButton={path !== '' && <BackButtonLink to="/guides" search={{ path }} disabled />}
      actions={
        <div className="flex w-full items-center justify-end gap-1 text-sm">
          <Button size="icon-sm" variant="secondary" className="size-6 min-h-6 min-w-6 sm:size-7 sm:min-h-7 sm:min-w-7">
            <MenuIcon />
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

type GuideWithFolder = Extract<GuidesOrFolder, { type: 'guide' }> & Pick<GuideWithStepsWithFolder, 'folder'>

type SelectedItem = { type: 'guide'; guide: GuideWithFolder } | { type: 'folder'; folder: string }

function GuidesPage() {
  const [isSelect, setSelect] = useState(false)
  const [selectedItemsToDelete, setSelectedItemsToDelete] = useState([] as SelectedItem[])
  const [searchTerm, setSearchTerm] = useState('')
  const [gameFilter, setGameFilter] = useState<GameType | 'all'>('all')
  const path = Route.useSearch({
    select: (search) => (search.path.startsWith('/') ? search.path.slice(1) : search.path),
  })
  const comesFrom = Route.useSearch({
    select: (s) => s.from,
  })
  const { t } = useLingui()
  const conf = useSuspenseQuery(confQuery)
  const profile = useProfile()
  const guides = useSuspenseQuery(guidesInFolderQuery(path))
  const allGuidesInPath = useSuspenseQuery(guidesQuery(path))

  const guidesWithCurrentProgression = guides.data
    .map((guide) => {
      if (guide.type === 'folder') return guide

      const currentStep = profile.progresses.find((progress) => progress.id === guide.id)?.currentStep ?? null

      return {
        ...guide,
        currentStep,
      } as GuideWithFolder & { currentStep: number | null }
    })
    .filter((guide) => guide !== null)
  const notDoneGuides = conf.data.showDoneGuides
    ? guidesWithCurrentProgression
    : // Filter out guides that are done (all steps are completed in the profile)
      guidesWithCurrentProgression.filter((guide) => {
        if (guide.type === 'folder') return true

        return guide.currentStep === null || guide.currentStep < guide.steps.length - 1
      })
  const gameFilteredGuides =
    gameFilter === 'all'
      ? notDoneGuides
      : notDoneGuides.filter((guide) => {
          if (guide.type === 'folder') return true
          return (guide.game_type ?? 'dofus') === gameFilter
        })
  const filteredGuides =
    searchTerm !== ''
      ? rankList({
          list: allGuidesInPath.data
            .map((g) => {
              const currentStep = profile.progresses.find((progress) => progress.id === g.id)?.currentStep ?? null

              return { ...g, currentStep, type: 'guide' } as Omit<Extract<GuidesOrFolder, { type: 'guide' }>, 'type'> & {
                currentStep: number | null
                type: 'guide'
                folder: string | null
              }
            })
            .filter((g) => gameFilter === 'all' || (g.game_type ?? 'dofus') === gameFilter),
          keys: [(guide) => guide.name],
          term: searchTerm,
          sortKeys: [(guide) => guide.order],
        })
      : rankList({
          list: gameFilteredGuides,
          keys: [(guide) => guide.name],
          term: searchTerm,
          sortKeys: [(guide) => (guide.type === 'folder' ? -1 : guide.order)],
        })

  const onEnterSelectMode = () => {
    setSelect(true)
    setSelectedItemsToDelete([])
  }

  const onExitSelectMode = () => {
    setSelect(false)
  }

  const onDeleteComplete = () => {
    guides.refetch()
  }

  const onSelectGuide = (guide: GuideWithFolder) => {
    const isSelected = selectedItemsToDelete.some((item) => item.type === 'guide' && item.guide.id === guide.id)

    if (isSelected) {
      setSelectedItemsToDelete((prev) => prev.filter((item) => !(item.type === 'guide' && item.guide.id === guide.id)))
    } else {
      setSelectedItemsToDelete((prev) => [...prev, { type: 'guide', guide }])
    }
  }

  const onSelectFolder = (folderPath: string) => {
    const isSelected = selectedItemsToDelete.some((item) => item.type === 'folder' && item.folder === folderPath)

    if (isSelected) {
      setSelectedItemsToDelete((prev) => prev.filter((item) => !(item.type === 'folder' && item.folder === folderPath)))
    } else {
      setSelectedItemsToDelete((prev) => [...prev, { type: 'folder', folder: folderPath }])
    }
  }

  const isItemToDeleteSelected = (guideIdOrFolder: string | number) => {
    return selectedItemsToDelete.some((guide) => {
      if (typeof guideIdOrFolder === 'string') {
        return guide.type === 'folder' && guide.folder === guideIdOrFolder
      }

      return guide.type === 'guide' && guide.guide.id === guideIdOrFolder
    })
  }

  const paths = path.split('/')
  const pathsWithoutLast = paths.slice(0, -1)
  const comesFromGuide = comesFrom !== undefined

  return (
    <Page
      key="guide-page"
      className="slot-[page-title-text]:whitespace-nowrap"
      title={comesFromGuide ? t`Choisissez un guide` : t`Guides ${createPagePath(path)}`}
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
      actions={<ActionsToolbar path={path} onEnterSelectMode={onEnterSelectMode} isSelectMode={isSelect} />}
    >
      <PageScrollableContent className="p-2">
        <div className="flex flex-col gap-2">
          {isSelect ? (
            <SelectionToolbar
              selectedItems={selectedItemsToDelete}
              onCancel={onExitSelectMode}
              onDeleteComplete={onDeleteComplete}
            />
          ) : (
            <>
              <ClearInput
                value={searchTerm}
                onChange={(evt) => setSearchTerm(evt.currentTarget.value)}
                onValueChange={setSearchTerm}
                autoComplete="off"
                autoCorrect="off"
                placeholder={t`Rechercher un guide`}
              />
              <div className="flex gap-1.5">
                <Button
                  size="sm"
                  variant={gameFilter === 'all' ? 'default' : 'outline'}
                  onClick={() => setGameFilter('all')}
                  className="flex-1"
                >
                  <Trans>Tous</Trans>
                </Button>
                <Button
                  size="sm"
                  variant={gameFilter === 'dofus' ? 'default' : 'outline'}
                  onClick={() => setGameFilter('dofus')}
                  className="flex-1"
                >
                  Dofus
                </Button>
                <Button
                  size="sm"
                  variant={gameFilter === 'wakfu' ? 'default' : 'outline'}
                  onClick={() => setGameFilter('wakfu')}
                  className="flex-1"
                >
                  Wakfu
                </Button>
              </div>
            </>
          )}

          {filteredGuides.map((guide) => {
            if (guide.type === 'folder') {
              const fullPath = `${path !== '' ? `${path}/` : ''}${guide.name}`
              const isThisFolderSelected = isItemToDeleteSelected(fullPath)

              return (
                <FolderItem
                  key={guide.name}
                  folder={guide}
                  path={path}
                  isSelected={isThisFolderSelected}
                  onSelect={onSelectFolder}
                  isSelectMode={isSelect}
                  comesFromGuide={comesFrom}
                />
              )
            }

            const isThisGuideSelected = isItemToDeleteSelected(guide.id)

            return (
              <GuideItem
                key={guide.id}
                variant="local"
                guide={guide}
                isSelected={isThisGuideSelected}
                onSelect={onSelectGuide}
                isSelectMode={isSelect}
              />
            )
          })}

          {!isSelect && (
            <Link
              to="/downloads/$status"
              params={{ status: 'gp' }}
              search={{ page: 1 }}
              className="flex flex-col items-center justify-center gap-2 rounded-xl border border-muted-foreground border-dashed px-2 py-3 text-muted-foreground"
            >
              <DownloadCloudIcon />
              <Trans>Télécharger un guide</Trans>
            </Link>
          )}
        </div>
      </PageScrollableContent>
    </Page>
  )
}
