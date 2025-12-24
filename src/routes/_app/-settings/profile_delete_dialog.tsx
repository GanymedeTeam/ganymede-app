import { Trans } from '@lingui/react/macro'
import { useSuspenseQuery } from '@tanstack/react-query'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert_dialog.tsx'
import { getProfileById } from '@/lib/profile.ts'
import { confQuery } from '@/queries/conf.query.ts'

interface ProfileDeleteDialogProps<T extends string | null> {
  profileId: T
  open: boolean
  onOpenChange: (open: boolean) => void
  onDelete: (profileId: T) => void
}

export function ProfileDeleteDialog<T extends string | null>({
  profileId: profileId,
  onDelete,
  open,
  onOpenChange,
}: ProfileDeleteDialogProps<T>) {
  const conf = useSuspenseQuery(confQuery)
  const profile = profileId ? getProfileById(conf.data.profiles, profileId) : undefined

  return (
    <AlertDialog onOpenChange={onOpenChange} open={open}>
      <AlertDialogContent className="max-w-sm">
        <AlertDialogHeader>
          <AlertDialogTitle>{profile && <Trans>Profil "{profile.name}"</Trans>}</AlertDialogTitle>
          <AlertDialogDescription>
            <Trans>Suppression du profil. Cette action est irréversible.</Trans>
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>
            <Trans>Annuler</Trans>
          </AlertDialogCancel>
          <AlertDialogAction onClick={() => onDelete(profileId)} variant="destructive">
            <Trans>Supprimer</Trans>
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
