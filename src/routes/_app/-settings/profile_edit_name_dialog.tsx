import { t } from '@lingui/core/macro'
import { Trans } from '@lingui/react/macro'
import { useSuspenseQuery } from '@tanstack/react-query'
import { useEffect, useState } from 'react'
import { toast } from 'sonner'
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
import { Input } from '@/components/ui/input.tsx'
import { getProfileById } from '@/lib/profile.ts'
import { useSetConf } from '@/mutations/set_conf.mutation.ts'
import { confQuery } from '@/queries/conf.query.ts'

interface ProfileEditNameDialogProps<T extends string | null> {
  profileId: T
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function ProfileEditNameDialog<T extends string | null>({
  profileId,
  open,
  onOpenChange,
}: ProfileEditNameDialogProps<T>) {
  const conf = useSuspenseQuery(confQuery)
  const profile = profileId ? getProfileById(conf.data.profiles, profileId) : undefined
  const [newProfileName, setNewProfileName] = useState(profile ? profile.name : '')
  const setConf = useSetConf()
  const profiles = conf.data.profiles

  useEffect(() => {
    if (profileId) {
      setNewProfileName(profile?.name ?? '')
    }
  }, [profileId, profile?.name])

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent className="max-w-sm" asChild>
        <form
          onSubmit={async (e) => {
            e.preventDefault()
            const trimmedName = newProfileName.trim()

            if (trimmedName.length === 0) {
              toast.error(t`Le nom du profil ne peut pas être vide.`)

              return
            }

            if (
              profiles.some((p) => p.name.trim().toLowerCase() === trimmedName.toLowerCase() && p.id !== profile?.id)
            ) {
              toast.error(t`Un profil est déjà utilisé avec ce nom.`)

              return
            }

            await setConf.mutateAsync({
              ...conf.data,
              profiles: profiles.map((p) => (p.id === profile?.id ? { ...p, name: trimmedName } : p)),
            })

            toast.success(t`Nom du profil mis à jour avec succès.`)

            onOpenChange(false)
          }}
        >
          <AlertDialogHeader>
            <AlertDialogTitle>{profile && <Trans>Profil "{profile.name}"</Trans>}</AlertDialogTitle>
            <AlertDialogDescription>
              <Trans>Vous allez modifier le profil "{profile?.name ?? ''}"</Trans>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <Input
            type="text"
            name="profile-name"
            value={newProfileName}
            onChange={(e) => setNewProfileName(e.target.value)}
            className="min-w-auto border-none bg-surface-card invalid:ring-2 invalid:ring-destructive focus:invalid:ring-destructive"
            autoFocus={!!profileId}
            required
            pattern=".+"
          />
          <AlertDialogFooter>
            <AlertDialogCancel>
              <Trans>Annuler</Trans>
            </AlertDialogCancel>
            <AlertDialogAction type="submit">
              <Trans>Modifier</Trans>
            </AlertDialogAction>
          </AlertDialogFooter>
        </form>
      </AlertDialogContent>
    </AlertDialog>
  )
}
