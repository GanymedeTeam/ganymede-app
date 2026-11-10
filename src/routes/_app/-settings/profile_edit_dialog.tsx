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
import { Button } from '@/components/ui/button.tsx'
import { Input } from '@/components/ui/input.tsx'
import { Label } from '@/components/ui/label.tsx'
import { Textarea } from '@/components/ui/textarea.tsx'
import { renameProfileRemote } from '@/ipc/sync.ts'
import { getProfileById } from '@/lib/profile.ts'
import { useSetConf } from '@/mutations/set_conf.mutation.ts'
import { confQuery } from '@/queries/conf.query.ts'

const defaultLevel = 200

function isIntegerInRange(value: string, min: number, max: number) {
  const n = Number(value)

  return value.trim() !== '' && Number.isInteger(n) && n >= min && n <= max
}

interface ProfileEditDialogProps<T extends string | null> {
  profileId: T
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function ProfileEditDialog<T extends string | null>({
  profileId,
  open,
  onOpenChange,
}: ProfileEditDialogProps<T>) {
  const conf = useSuspenseQuery(confQuery)
  const profile = profileId ? getProfileById(conf.data.profiles, profileId) : undefined
  const [newProfileName, setNewProfileName] = useState(profile ? profile.name : '')
  const [level, setLevel] = useState('')
  const [charactersCount, setCharactersCount] = useState('')
  const [note, setNote] = useState('')
  const setConf = useSetConf()
  const profiles = conf.data.profiles

  useEffect(() => {
    if (profileId) {
      setNewProfileName(profile?.name ?? '')
      setLevel((profile?.level ?? defaultLevel).toString())
      setCharactersCount(profile?.characters_count?.toString() ?? '')
      setNote(profile?.note ?? '')
    }
  }, [profileId, profile?.name, profile?.level, profile?.characters_count, profile?.note])

  const isFormValid =
    newProfileName.trim().length > 0 &&
    isIntegerInRange(level, 1, 200) &&
    (charactersCount === '' || isIntegerInRange(charactersCount, 1, 8))

  return (
    <AlertDialog onOpenChange={onOpenChange} open={open}>
      <AlertDialogContent asChild className="max-w-sm">
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

            const trimmedNote = note.trim()

            await setConf.mutateAsync({
              ...conf.data,
              profiles: profiles.map((p) =>
                p.id === profile?.id
                  ? {
                      ...p,
                      name: trimmedName,
                      level: Number(level),
                      characters_count: charactersCount === '' ? null : Number(charactersCount),
                      note: trimmedNote === '' ? null : trimmedNote,
                    }
                  : p,
              ),
            })

            if (profile?.server_id && trimmedName !== profile.name) {
              renameProfileRemote(profile.server_id, trimmedName).then((result) => {
                if (result.isErr()) {
                  // silent — logged in IPC layer
                }
              })
            }

            toast.success(t`Profil mis à jour avec succès.`)

            onOpenChange(false)
          }}
        >
          <AlertDialogHeader>
            <AlertDialogTitle>{profile && <Trans>Profil "{profile.name}"</Trans>}</AlertDialogTitle>
            <AlertDialogDescription>
              <Trans>Vous allez modifier le profil "{profile?.name ?? ''}"</Trans>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <Label htmlFor="profile-name">
            <Trans>Nom</Trans>
          </Label>
          <Input
            autoFocus={!!profileId}
            className="min-w-auto border-none bg-surface-card invalid:ring-2 invalid:ring-destructive focus:invalid:ring-destructive"
            id="profile-name"
            name="profile-name"
            onChange={(e) => setNewProfileName(e.target.value)}
            pattern=".+"
            required
            type="text"
            value={newProfileName}
          />
          <Label htmlFor="profile-level">
            <Trans>Niveau</Trans>
          </Label>
          <Input
            className="min-w-auto border-none bg-surface-card invalid:ring-2 invalid:ring-destructive focus:invalid:ring-destructive"
            id="profile-level"
            max={200}
            min={1}
            name="profile-level"
            onChange={(e) => setLevel(e.target.value)}
            required
            type="number"
            value={level}
          />
          <Label htmlFor="profile-characters-count">
            <Trans>Nombre de personnages</Trans>
          </Label>
          <Input
            className="min-w-auto border-none bg-surface-card invalid:ring-2 invalid:ring-destructive focus:invalid:ring-destructive"
            id="profile-characters-count"
            max={8}
            min={1}
            name="profile-characters-count"
            onChange={(e) => setCharactersCount(e.target.value)}
            type="number"
            value={charactersCount}
          />
          <Label htmlFor="profile-note">
            <Trans>Note</Trans>
          </Label>
          <Textarea
            className="border-none bg-surface-card"
            id="profile-note"
            name="profile-note"
            onChange={(e) => setNote(e.target.value)}
            value={note}
          />
          <AlertDialogFooter>
            <AlertDialogCancel>
              <Trans>Annuler</Trans>
            </AlertDialogCancel>
            <AlertDialogAction asChild>
              <Button disabled={!isFormValid} type="submit">
                <Trans>Modifier</Trans>
              </Button>
            </AlertDialogAction>
          </AlertDialogFooter>
        </form>
      </AlertDialogContent>
    </AlertDialog>
  )
}
