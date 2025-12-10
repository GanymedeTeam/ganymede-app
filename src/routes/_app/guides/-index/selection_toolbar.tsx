import { Trans, useLingui } from '@lingui/react/macro'
import { useQueryClient } from '@tanstack/react-query'
import { useState } from 'react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button.tsx'
import { GuideOrFolderToDelete, GuidesOrFolder } from '@/ipc/bindings.ts'
import { GuideWithStepsWithFolder } from '@/ipc/ipc.ts'
import { useDeleteGuidesInSystem } from '@/mutations/delete_guides_in_system.mutation.ts'
import { guidesQuery } from '@/queries/guides.query.ts'
import { DeleteGuidesDialog } from './delete_guides_dialog.tsx'

type GuideWithFolder = Extract<GuidesOrFolder, { type: 'guide' }> & Pick<GuideWithStepsWithFolder, 'folder'>

type SelectedItem = { type: 'guide'; guide: GuideWithFolder } | { type: 'folder'; folder: string }

interface SelectionToolbarProps {
  selectedItems: SelectedItem[]
  onCancel: () => void
  onDeleteComplete?: () => void
}

export function SelectionToolbar({ selectedItems, onCancel, onDeleteComplete }: SelectionToolbarProps) {
  const { t } = useLingui()
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const queryClient = useQueryClient()
  const deleteGuidesInSystem = useDeleteGuidesInSystem()

  const onDeleteGuidesInSystem = () => {
    if (selectedItems.length === 0) return

    const guidesAndFolder = selectedItems.map((guideOrFolder) => {
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
        setDeleteDialogOpen(false)
        onCancel()
        onDeleteComplete?.()
      })
      .finally(() => {
        queryClient.invalidateQueries(guidesQuery())
      })
  }

  return (
    <div className="sticky top-0 z-10 flex gap-2 py-2 backdrop-blur-sm -mx-2 px-2">
      <DeleteGuidesDialog
        open={deleteDialogOpen}
        onOpenChange={setDeleteDialogOpen}
        selectedItems={selectedItems}
        onConfirm={onDeleteGuidesInSystem}
      >
        <Button className="w-full" variant="destructive">
          <Trans>Supprimer</Trans>
        </Button>
      </DeleteGuidesDialog>
      <Button className="w-full" onClick={onCancel} variant="outline">
        <Trans>Annuler</Trans>
      </Button>
    </div>
  )
}
