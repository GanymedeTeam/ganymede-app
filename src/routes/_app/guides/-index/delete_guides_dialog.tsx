import { Trans } from '@lingui/react/macro'
import { FolderIcon } from 'lucide-react'
import { DownloadImage } from '@/components/download_image.tsx'
import { FlagPerLang } from '@/components/flag_per_lang.tsx'
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
import { ScrollArea } from '@/components/ui/scroll_area.tsx'
import { GuidesOrFolder } from '@/ipc/bindings.ts'
import { GuideWithStepsWithFolder } from '@/ipc/ipc.ts'

type GuideWithFolder = Extract<GuidesOrFolder, { type: 'guide' }> & Pick<GuideWithStepsWithFolder, 'folder'>

type SelectedItem = { type: 'guide'; guide: GuideWithFolder } | { type: 'folder'; folder: string }

interface DeleteGuidesDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  selectedItems: SelectedItem[]
  onConfirm: () => void
  children: React.ReactNode
}

const USE_GUIDE_IMAGE = false

export function DeleteGuidesDialog({
  open,
  onOpenChange,
  selectedItems,
  onConfirm,
  children,
}: DeleteGuidesDialogProps) {
  return (
    <AlertDialog onOpenChange={onOpenChange} open={open}>
      <AlertDialogTrigger asChild disabled={selectedItems.length === 0}>
        {children}
      </AlertDialogTrigger>
      <AlertDialogContent className="flex h-full max-h-[90vh] flex-col">
        <AlertDialogHeader>
          <AlertDialogTitle>
            <Trans>Suppression de guides</Trans>
          </AlertDialogTitle>
          <AlertDialogDescription>
            <Trans>
              Vous vous apprêtez à supprimer des guides de votre système. La progression ne sera pas supprimée.
            </Trans>
          </AlertDialogDescription>
        </AlertDialogHeader>
        <ScrollArea className="h-full">
          <div className="flex flex-col gap-2">
            {selectedItems.map((guideOrFolder) => {
              if (guideOrFolder.type === 'folder') {
                return (
                  <Card className="flex gap-2 p-2 xs:px-3 text-xxs xs:text-sm sm:text-base" key={guideOrFolder.folder}>
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
                <Card className="flex gap-2 p-2 xs:px-3 text-xxs xs:text-sm sm:text-base" key={guide.id}>
                  {USE_GUIDE_IMAGE && guide.node_image && (
                    <div className="flex flex-col items-center justify-center">
                      <DownloadImage
                        className="size-8 xs:size-10 rounded object-cover sm:size-12"
                        src={guide.node_image}
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
          <Button className="xs:h-9 xs:px-4 xs:text-sm" onClick={onConfirm} variant="destructive">
            <Trans>Supprimer</Trans>
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
