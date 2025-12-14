import { Trans, useLingui } from '@lingui/react/macro'
import { useQuery, useQueryClient, useSuspenseQuery } from '@tanstack/react-query'
import {
  FolderOpenIcon,
  FolderSyncIcon,
  ImportIcon,
  MenuIcon,
  ServerCrashIcon,
  SquareMousePointerIcon,
} from 'lucide-react'
import { useEffect, useState } from 'react'
import { toast } from 'sonner'
import { Loader2Icon } from 'lucide-react'
import { Button } from '@/components/ui/button.tsx'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown_menu.tsx'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip.tsx'

import { cn } from '@/lib/utils.ts'
import { useOpenGuidesFolder } from '@/mutations/open_guides_folder.mutation.ts'
import { useUpdateAllAtOnce } from '@/mutations/update_all_at_once.mutation.ts'
import { guidesInFolderQuery, guidesQuery } from '@/queries/guides.query.ts'
import { hasGuidesNotUpdatedQuery } from '@/queries/has_guides_not_updated.query.ts'
import { GuideUpdateAllResultDialog } from './guide_update_all_result_dialog.tsx'

interface ActionsToolbarProps {
  path: string
  onEnterSelectMode: () => void
  isSelectMode: boolean
}

export function ActionsToolbar({ path, onEnterSelectMode, isSelectMode }: ActionsToolbarProps) {
  const { t } = useLingui()
  const [isHasUpdateTooltipOpen, setHasUpdateTooltipOpen] = useState(false)
  const queryClient = useQueryClient()
  const guides = useSuspenseQuery(guidesInFolderQuery(path))
  const hasSomeGuideNotUpdated = useQuery(hasGuidesNotUpdatedQuery)
  const openGuidesFolder = useOpenGuidesFolder()
  const updateAllAtOnce = useUpdateAllAtOnce({
    onSuccess: (data) => {
      const hasErrors = Object.values(data).some((v) => v !== null)
      if (hasErrors) {
        toast.warning(t`Mise à jour terminée avec des erreurs`)
      } else {
        toast.success(t`Tous les guides ont été mis à jour`)
      }
    },
    onError: () => {
      toast.error(t`Erreur lors de la mise à jour des guides`)
    },
  })

  const updateAllAtOnceGotError =
    updateAllAtOnce.isSuccess && Object.values(updateAllAtOnce.data).some((v) => v !== null)
  const hasGuidesNotUpdated = hasSomeGuideNotUpdated.isSuccess && hasSomeGuideNotUpdated.data

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

  useEffect(() => {
    let timer: NodeJS.Timeout | undefined

    if (hasGuidesNotUpdated) {
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
  }, [hasGuidesNotUpdated])

  return (
    <>
      <div className="flex w-full items-center justify-end gap-1 text-sm">
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
          <Tooltip
            open={isHasUpdateTooltipOpen}
            onOpenChange={(open) => {
              if (!hasGuidesNotUpdated) {
                setHasUpdateTooltipOpen(false)

                return
              }

              setHasUpdateTooltipOpen(open)
            }}
          >
            <TooltipTrigger asChild>
              <Button
                size="icon-sm"
                variant="secondary"
                onClick={onUpdateAllAtOnce}
                title={t`Mettre à jour tous les guides`}
                className={cn(
                  'size-6 min-h-6 min-w-6 sm:size-7 sm:min-h-7 sm:min-w-7',
                  hasGuidesNotUpdated && 'text-orange-400',
                )}
                disabled={updateAllAtOnce.isPending || guides.isFetching}
              >
                {updateAllAtOnce.isPending ? <Loader2Icon className="size-4 animate-spin" /> : <ImportIcon className="size-4" />}
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
            <DropdownMenuItem onClick={onEnterSelectMode}>
              <SquareMousePointerIcon className="size-4" />
              <Trans>Sélectionner</Trans>
            </DropdownMenuItem>
            <DropdownMenuItem onClick={onOpenExplorer}>
              <FolderOpenIcon className="size-4" />
              <Trans>Ouvrir le dossier des guides téléchargés</Trans>
            </DropdownMenuItem>
            <DropdownMenuItem onClick={onRefresh} disabled={isSelectMode}>
              <FolderSyncIcon className="size-4" />
              <Trans>Rafraichir le dossier des guides téléchargés</Trans>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div >
    </>
  )
}
