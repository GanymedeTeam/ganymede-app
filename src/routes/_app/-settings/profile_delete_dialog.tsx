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
import { Button } from '@/components/ui/button.tsx'
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
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent className="max-w-sm">
        <AlertDialogHeader>
          <AlertDialogTitle>{profile && <Trans>Profil "{profile.name}"</Trans>}</AlertDialogTitle>
          <AlertDialogDescription>
            <Trans>Êtes-vous sûr de vouloir supprimer ce profil ? Cette action est irréversible.</Trans>
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>
            <Trans>Annuler</Trans>
          </AlertDialogCancel>
          <AlertDialogAction asChild>
            <Button variant="destructive" onClick={() => onDelete(profileId)}>
              <Trans>Supprimer</Trans>
            </Button>
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
