import { Trans } from '@lingui/react/macro'
import { TrashIcon } from 'lucide-react'
import { PropsWithChildren, type MouseEvent } from 'react'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert_dialog.tsx'
import { Button } from '@/components/ui/button.tsx'

interface ProfileDeleteDialogProps {
  profileName: string
  open: boolean
  onOpenChange: (open: boolean) => void
  onDelete: (evt: MouseEvent) => void
}

export function ProfileDeleteDialog({
  profileName,
  onDelete,
  open,
  onOpenChange,
  children,
}: PropsWithChildren<ProfileDeleteDialogProps>) {
  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogTrigger asChild>{children}</AlertDialogTrigger>
      <AlertDialogContent className="max-w-sm">
        <AlertDialogHeader>
          <AlertDialogTitle>
            <Trans>Profil "{profileName}"</Trans>
          </AlertDialogTitle>
          <AlertDialogDescription>
            <Trans>Êtes-vous sûr de vouloir supprimer ce profil ? Cette action est irréversible.</Trans>
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>
            <Trans>Annuler</Trans>
          </AlertDialogCancel>
          <AlertDialogAction asChild>
            <Button variant="destructive" onClick={onDelete}>
              <Trans>Supprimer</Trans>
            </Button>
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
