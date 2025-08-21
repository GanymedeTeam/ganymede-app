import { Trans, useLingui } from '@lingui/react/macro'
import { useQuery, useQueryClient, useSuspenseQuery } from '@tanstack/react-query'
import { createFileRoute, Link } from '@tanstack/react-router'
import {
  BookIcon,
  ChevronRightIcon,
  DownloadCloudIcon,
  FolderIcon,
  FolderOpenIcon,
  FolderSyncIcon,
  ImportIcon,
  MenuIcon,
  ServerCrashIcon,
  SquareMousePointerIcon,
} from 'lucide-react'
import { useEffect, useState } from 'react'
import { toast } from 'sonner'
import { z } from 'zod'
import { DownloadImage } from '@/components/download_image.tsx'
import { FlagPerLang } from '@/components/flag_per_lang.tsx'
import { GenericLoader } from '@/components/generic_loader.tsx'
import { GuideDownloadButton } from '@/components/guide_download_button.tsx'
import { PageScrollableContent } from '@/components/page_scrollable_content.tsx'
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert_dialog.tsx'
import { Button } from '@/components/ui/button.tsx'
import { Card } from '@/components/ui/card.tsx'
import { ClearInput } from '@/components/ui/clear_input.tsx'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown_menu.tsx'
import { ScrollArea } from '@/components/ui/scroll_area.tsx'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip.tsx'
import { useInterval } from '@/hooks/use_interval.ts'
import { useProfile } from '@/hooks/use_profile.ts'
import { GuideOrFolderToDelete, GuidesOrFolder } from '@/ipc/bindings.ts'
import { GuideWithStepsWithFolder } from '@/ipc/ipc.ts'
import { clamp } from '@/lib/clamp.ts'
import { getStepOr } from '@/lib/progress.ts'
import { rankList } from '@/lib/rank.ts'
import { OpenedGuideZod } from '@/lib/tabs.ts'
import { cn } from '@/lib/utils.ts'
import { useDeleteGuidesInSystem } from '@/mutations/delete_guides_in_system.mutation.ts'
import { useOpenGuidesFolder } from '@/mutations/open_guides_folder.mutation.ts'
import { useUpdateAllAtOnce } from '@/mutations/update_all_at_once.mutation.ts'
import { confQuery } from '@/queries/conf.query.ts'
import { guidesInFolderQuery, guidesQuery } from '@/queries/guides.query.ts'
import { hasGuidesNotUpdatedQuery } from '@/queries/has_guides_not_updated.query.ts'
import { GuideUpdateAllResultDialog } from '@/routes/_app/guides/-guide_update_all_result_dialog.tsx'
import { Page } from '@/routes/-page.tsx'
import { BackButtonLink } from '../downloads/-back_button_link.tsx'

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

const USE_GUIDE_IMAGE = false

function GuidesPage() {
  const [openAlertDialogDeleteGuide, setOpenAlertDialogDeleteGuide] = useState(false)
  const [isSelect, setSelect] = useState(false)
  const [selectedItemsToDelete, setSelectedItemsToDelete] = useState(
    [] as ({ type: 'guide'; guide: GuideWithFolder } | { type: 'folder'; folder: string })[],
  )
  const [isHasUpdateTooltipOpen, setHasUpdateTooltipOpen] = useState(false)
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

  const onRefresh = () => {
    if (!guides.isFetching) {
      toast.promise(
        Promise.all([
          guides.refetch(),
          queryClient.invalidateQueries(guidesQuery()),
          queryClient.invalidateQueries(hasGuidesNotUpdatedQuery),
        ]),
        {
          success: t`Dossier des guides téléchargés rafraichi`,
          error: t`Erreur lors du rafraichissement des guides téléchargés`,
          loading: t`Rafraichissement des guides téléchargés`,
        },
      )
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

  const onSelectGuide = () => {
    setSelect(true)
    setSelectedItemsToDelete([])
  }

  const onDeleteGuidesInSystem = () => {
    if (selectedItemsToDelete.length === 0) return

    const guidesAndFolder = selectedItemsToDelete.map((guideOrFolder) => {
      if (guideOrFolder.type === 'guide') {
        return {
          type: 'guide',
          id: guideOrFolder.guide.id,
          folder: guideOrFolder.guide.folder,
        } satisfies Extract<GuideOrFolderToDelete, { type: 'guide' }>
      }

      return {
        type: 'folder',
        folder: guideOrFolder.folder,
      } satisfies Extract<GuideOrFolderToDelete, { type: 'folder' }>
    })

    toast
      .promise(deleteGuidesInSystem.mutateAsync(guidesAndFolder), {
        loading: t`Suppression des guides`,
        success: t`Guides supprimés`,
        error: t`Erreur lors de la suppression des guides`,
      })
      .unwrap()
      .catch((err) => {
        console.error(err)
      })
      .then(() => {
        setOpenAlertDialogDeleteGuide(false)
        setSelect(false)
        setSelectedItemsToDelete([])
      })
      .finally(() => {
        guides.refetch()
        queryClient.invalidateQueries(guidesQuery())
      })
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

  const updateAllAtOnceGotError =
    updateAllAtOnce.isSuccess && Object.values(updateAllAtOnce.data).some((v) => v !== null)
  const hasSomeGuideNotUpdated = useQuery(hasGuidesNotUpdatedQuery)
  const deleteGuidesInSystem = useDeleteGuidesInSystem()

  useEffect(() => {
    let timer: NodeJS.Timeout | undefined

    if (hasSomeGuideNotUpdated.isSuccess && hasSomeGuideNotUpdated.data) {
      setHasUpdateTooltipOpen(true)

      timer = setTimeout(() => {
        setHasUpdateTooltipOpen(false)
      }, 5000)
    }

    return () => {
      if (timer) {
        clearTimeout(timer)
      }
    }
  }, [hasSomeGuideNotUpdated.isSuccess, hasSomeGuideNotUpdated.data])

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
          <TooltipProvider disableHoverableContent>
            <Tooltip open={isHasUpdateTooltipOpen} onOpenChange={setHasUpdateTooltipOpen}>
              <TooltipTrigger>
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
              </TooltipTrigger>
              <TooltipContent align="center" side="bottom">
                <Trans>Des mises à jour sont disponibles</Trans>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                size="icon-sm"
                variant="secondary"
                title={t`Plus d'options`}
                className="size-6 min-h-6 min-w-6 sm:size-7 sm:min-h-7 sm:min-w-7"
              >
                <MenuIcon className="size-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent className="max-w-[calc(75vw)]">
              <DropdownMenuItem onClick={onSelectGuide}>
                <SquareMousePointerIcon className="size-4" />
                <Trans>Sélectionner</Trans>
              </DropdownMenuItem>
              <DropdownMenuItem onClick={onOpenExplorer}>
                <FolderOpenIcon className="size-4" />
                <Trans>Ouvrir le dossier des guides téléchargés</Trans>
              </DropdownMenuItem>
              <DropdownMenuItem onClick={onRefresh} disabled={isSelect}>
                <FolderSyncIcon className="size-4" />
                <Trans>Rafraichir le dossier des guides téléchargés</Trans>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      }
    >
      <PageScrollableContent className="p-2">
        <div className="flex flex-col gap-2">
          {updateAllAtOnce.isPending && (
            <div className="fixed inset-0 top-15 z-10 flex flex-col items-center justify-center bg-accent/75">
              <div className="flex items-center">
                <div className="flex items-center gap-2 p-2">
                  <span>
                    <Trans>Mise à jour de vos guides...</Trans>
                  </span>
                </div>
              </div>
              <span className="text-3xl">{interval.seconds.toFixed(1)}s</span>
            </div>
          )}

          {isSelect ? (
            <div className="sticky top-0 z-10 flex gap-2 bg-background py-0">
              <AlertDialog open={openAlertDialogDeleteGuide} onOpenChange={setOpenAlertDialogDeleteGuide}>
                <AlertDialogTrigger asChild disabled={selectedItemsToDelete.length === 0}>
                  <Button className="w-full" variant="destructive">
                    <Trans>Supprimer</Trans>
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent className="flex h-full max-h-[90vh] flex-col">
                  <AlertDialogHeader>
                    <AlertDialogTitle>
                      <Trans>Suppression de guides</Trans>
                    </AlertDialogTitle>
                    <AlertDialogDescription>
                      <Trans>Vous vous apprêtez à supprimer des guides de votre système.</Trans>
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <ScrollArea className="h-full">
                    <div className="flex flex-col gap-2">
                      {selectedItemsToDelete.map((guideOrFolder) => {
                        if (guideOrFolder.type === 'folder') {
                          return (
                            <Card
                              key={guideOrFolder.folder}
                              className="flex gap-2 p-2 xs:px-3 text-xxs xs:text-sm sm:text-base"
                            >
                              <div className="flex min-w-9 flex-col items-center gap-0.5">
                                <FolderIcon />
                              </div>
                              <div className="flex grow flex-col gap-1">
                                <h3 className="grow text-balance font-mono">{guideOrFolder.folder}</h3>
                              </div>
                            </Card>
                          )
                        }

                        const guide = guideOrFolder.guide

                        return (
                          <Card key={guide.id} className="flex gap-2 p-2 xs:px-3 text-xxs xs:text-sm sm:text-base">
                            {USE_GUIDE_IMAGE && guide.node_image && (
                              <div className="flex flex-col items-center justify-center">
                                <DownloadImage
                                  src={guide.node_image}
                                  className="size-8 xs:size-10 rounded object-cover sm:size-12"
                                />
                              </div>
                            )}
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
                            </div>
                          </Card>
                        )
                      })}
                    </div>
                  </ScrollArea>
                  <AlertDialogFooter className="xs:flex-row xs:items-center xs:justify-center">
                    <AlertDialogCancel className="mt-0 xs:h-9 xs:px-4 xs:text-sm">
                      <Trans>Annuler</Trans>
                    </AlertDialogCancel>
                    <Button
                      variant="destructive"
                      className="xs:h-9 xs:px-4 xs:text-sm"
                      onClick={onDeleteGuidesInSystem}
                    >
                      <Trans>Supprimer</Trans>
                    </Button>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
              <Button
                className="w-full"
                onClick={() => {
                  setSelect(false)
                  setSelectedItemsToDelete([])
                }}
              >
                <Trans>Annuler</Trans>
              </Button>
            </div>
          ) : (
            <ClearInput
              value={searchTerm}
              onChange={(evt) => setSearchTerm(evt.currentTarget.value)}
              onValueChange={setSearchTerm}
              autoComplete="off"
              autoCorrect="off"
              placeholder={t`Rechercher un guide`}
            />
          )}

          {filteredGuides.map((guide) => {
            if (guide.type === 'folder') {
              const fullPath = `${path !== '' ? `${path}/` : ''}${guide.name}`
              const isThisFolderSelected = isItemToDeleteSelected(fullPath)

              console.log('isThisFolderSelected', isThisFolderSelected)

              return (
                <Card
                  key={guide.name}
                  aria-selected={isThisFolderSelected}
                  className={cn(
                    'flex items-center gap-2 p-2 xs:px-3 text-xxs xs:text-sm aria-selected:bg-accent sm:text-base',
                  )}
                  asChild
                >
                  <Link
                    to="/guides"
                    search={{
                      path: fullPath,
                      ...(comesFromGuide ? { from: comesFrom } : {}),
                    }}
                    draggable={false}
                    onClick={(evt) => {
                      if (!isSelect) {
                        return
                      }

                      evt.preventDefault()
                      evt.stopPropagation()

                      if (isThisFolderSelected) {
                        setSelectedItemsToDelete((prev) =>
                          prev.filter((itemsToDelete) => {
                            if (itemsToDelete.type === 'folder') {
                              const fullPath = `${path !== '' ? `${path}/` : ''}${guide.name}`
                              console.log({ itemsToDelete, guide })
                              return itemsToDelete.folder !== fullPath
                            }

                            return true
                          }),
                        )
                      } else {
                        setSelectedItemsToDelete((prev) => [...prev, { type: 'folder', folder: fullPath }])
                      }
                    }}
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
            const isThisGuideSelected = isItemToDeleteSelected(guide.id)

            return (
              <Card
                key={guide.id}
                aria-selected={isThisGuideSelected}
                className={cn(
                  'flex gap-2 p-2 xs:px-3 text-xxs xs:text-sm aria-selected:bg-accent sm:text-base',
                  isSelect && 'cursor-pointer **:cursor-pointer',
                )}
                onClick={(evt) => {
                  if (!isSelect) {
                    return
                  }

                  evt.preventDefault()
                  evt.stopPropagation()

                  if (isThisGuideSelected) {
                    setSelectedItemsToDelete((prev) =>
                      prev.filter((itemsToDelete) => {
                        if (itemsToDelete.type === 'folder') return true

                        return itemsToDelete.guide.id !== guide.id
                      }),
                    )
                  } else {
                    setSelectedItemsToDelete((prev) => [...prev, { type: 'guide', guide }])
                  }
                }}
                asChild
              >
                <li>
                  <div className="flex min-w-9 flex-col items-center gap-0.5">
                    {USE_GUIDE_IMAGE && (
                      <div className="flex grow flex-col items-center">
                        {guide.node_image ? (
                          <DownloadImage src={guide.node_image} className="size-8 rounded object-cover" />
                        ) : (
                          <BookIcon className="size-6" />
                        )}
                      </div>
                    )}
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
                    {!isSelect && (
                      <>
                        <Button asChild variant="secondary" size="icon" disabled={!hasOpenButton}>
                          <Link to="/guides/$id" params={{ id: guide.id }} search={{ step: step - 1 }}>
                            <ChevronRightIcon />
                          </Link>
                        </Button>
                        <GuideDownloadButton guide={guide} />
                      </>
                    )}
                  </div>
                </li>
              </Card>
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
