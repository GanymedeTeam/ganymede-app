import { Trans, useLingui } from '@lingui/react/macro'
import { useSuspenseQuery } from '@tanstack/react-query'
import { createFileRoute, Link } from '@tanstack/react-router'
import { MenuIcon } from 'lucide-react'
import { useState } from 'react'
import { z } from 'zod'
import addGuideImage from '@/assets/add-guide.png'
import { GenericLoader } from '@/components/generic_loader.tsx'
import { PageScrollableContent } from '@/components/page_scrollable_content.tsx'
import { Button } from '@/components/ui/button.tsx'
import { ClearInput } from '@/components/ui/clear_input.tsx'
import { useProfile } from '@/hooks/use_profile.ts'
import { GuidesOrFolder } from '@/ipc/bindings.ts'
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
  const filteredGuides =
    searchTerm !== ''
      ? rankList({
          list: allGuidesInPath.data.map((g) => {
            const currentStep = profile.progresses.find((progress) => progress.id === g.id)?.currentStep ?? null

            return { ...g, currentStep, type: 'guide' } as Omit<Extract<GuidesOrFolder, { type: 'guide' }>, 'type'> & {
              currentStep: number | null
              type: 'guide'
              folder: string | null
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
      title={comesFromGuide ? t`Choisissez un guide` : t`Mes guides ${createPagePath(path)}`}
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
      <PageScrollableContent className="px-2">
        <div className="flex flex-col gap-2">
          {isSelect ? (
            <SelectionToolbar
              selectedItems={selectedItemsToDelete}
              onCancel={onExitSelectMode}
              onDeleteComplete={onDeleteComplete}
            />
          ) : (
            <div className="-mx-2 sticky top-0 z-50 px-2 py-2 backdrop-blur-sm">
              <ClearInput
                value={searchTerm}
                onChange={(evt) => setSearchTerm(evt.currentTarget.value)}
                onValueChange={setSearchTerm}
                autoComplete="off"
                autoCorrect="off"
                placeholder={t`Rechercher un guide`}
                className="h-10 rounded-xl border border-border-muted bg-surface-card px-4 text-sm placeholder:text-muted-foreground/70"
              />
            </div>
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
              className="flex gap-3 rounded-xl border border-border-muted bg-surface-card p-3 shadow-[0_5px_14px_rgba(0,0,0,0.5)] transition-colors hover:bg-surface-inset/70"
            >
              {/* Image */}
              <div className="relative flex shrink-0 items-center justify-center">
                <img src={addGuideImage} alt="Parcourir le catalogue" className="size-14 rounded-lg object-cover" />
              </div>

              {/* Content */}
              <div className="flex min-w-0 grow flex-col justify-center gap-1">
                <h3 className="font-semibold text-sm leading-tight">
                  <Trans>Parcourir le catalogue</Trans>
                </h3>
                <p className="hidden text-muted-foreground text-xs leading-tight sm:block">
                  <Trans>Découvrez et ajoutez de nouveaux guides à votre liste.</Trans>
                </p>
              </div>

              <div className="flex items-center pl-1">
                <svg width="0" height="0" className="absolute">
                  <defs>
                    <linearGradient id="goldGradientCatalog" x1="0%" y1="0%" x2="100%" y2="100%">
                      <stop offset="0%" stopColor="#fceaa8ff" />
                      <stop offset="50%" stopColor="#e7c272ff" />
                      <stop offset="100%" stopColor="#D7B363" />
                    </linearGradient>
                  </defs>
                </svg>
                <svg
                  viewBox="0 0 24 24"
                  className="size-7"
                  fill="none"
                  stroke="url(#goldGradientCatalog)"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="m9 18 6-6-6-6" />
                </svg>
              </div>
            </Link>
          )}
        </div>
      </PageScrollableContent>
    </Page>
  )
}
