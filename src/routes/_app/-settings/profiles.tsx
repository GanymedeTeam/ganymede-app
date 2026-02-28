import { Trans, useLingui } from '@lingui/react/macro'
import { rankItem } from '@tanstack/match-sorter-utils'
import { useSuspenseQuery } from '@tanstack/react-query'
import { CheckIcon, ChevronsUpDownIcon, PenIcon, TrashIcon } from 'lucide-react'
import { useState } from 'react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button.tsx'
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command.tsx'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover.tsx'
import { selectVariants } from '@/components/ui/select.tsx'
import { useProfile } from '@/hooks/use_profile.ts'
import { removeProfileFromRecentGuides } from '@/ipc/guides.ts'
import { deleteProfileRemote } from '@/ipc/sync.ts'
import { getProfileById } from '@/lib/profile.ts'
import { cn } from '@/lib/utils.ts'
import { useSetConf } from '@/mutations/set_conf.mutation.ts'
import { confQuery } from '@/queries/conf.query.ts'
import { ProfileDeleteDialog } from '@/routes/_app/-settings/profile_delete_dialog.tsx'
import { ProfileEditNameDialog } from '@/routes/_app/-settings/profile_edit_name_dialog.tsx'

export function Profiles() {
  const { t } = useLingui()
  const conf = useSuspenseQuery(confQuery)
  const setConf = useSetConf()
  const profiles = conf.data.profiles
  const currentProfile = useProfile()
  const [open, setOpen] = useState(false)
  const [openProfileDeleteDialog, setOpenProfileDeleteDialog] = useState(false)
  const [profileDeletionOpenId, setProfileDeletionOpenId] = useState<string | null>(null)
  const [profileEditNameId, setEditProfileNameId] = useState<string | null>(null)
  const [openProfileEditNameDialog, setOpenProfileEditNameDialog] = useState(false)

  return (
    <Popover
      onOpenChange={(open) => {
        setOpen(open)

        if (!openProfileEditNameDialog) {
          setEditProfileNameId(null)
        }
      }}
      open={open}
    >
      <PopoverTrigger asChild>
        <Button aria-expanded={open} className={selectVariants()} role="combobox">
          {currentProfile?.name ?? 'Select profile'}
          <ChevronsUpDownIcon className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <ProfileEditNameDialog
        onOpenChange={(open) => {
          if (!open) {
            setTimeout(() => {
              setEditProfileNameId(null)
            }, 500)
          }

          setOpenProfileEditNameDialog(open)
        }}
        open={openProfileEditNameDialog}
        profileId={profileEditNameId}
      />
      <ProfileDeleteDialog
        onDelete={async (profileId) => {
          if (!profileId) return

          const index = profiles.findIndex((p) => p.id === profileId)
          const nextProfileToUse =
            conf.data.profileInUse === profileId
              ? (profiles.at(index - 1)?.id ?? conf.data.profileInUse)
              : conf.data.profileInUse

          const deletedProfile = profiles.find((p) => p.id === profileId)

          await setConf.mutateAsync({
            ...conf.data,
            profiles: profiles.filter((p) => p.id !== profileId),
            profileInUse: nextProfileToUse,
          })

          if (deletedProfile?.server_id) {
            deleteProfileRemote(deletedProfile.server_id).then((result) => {
              if (result.isErr()) {
                // silent — logged in IPC layer
              }
            })
          }

          await removeProfileFromRecentGuides(profileId)

          toast.success(t`Profil supprimé avec succès`)

          setOpenProfileDeleteDialog(false)
        }}
        onOpenChange={(open) => {
          if (!open) {
            setTimeout(() => {
              setProfileDeletionOpenId(null)
            }, 500)
          }

          setOpenProfileDeleteDialog(open)
        }}
        open={openProfileDeleteDialog}
        profileId={profileDeletionOpenId}
      />
      <PopoverContent className="w-[calc(100vw-2rem)] max-w-sm p-0">
        <Command
          filter={(value, search) => {
            const profileInList = getProfileById(profiles, value)

            if (!profileInList) {
              return 0
            }

            const rank = rankItem(profileInList.name, search)

            return rank.rank > 0 ? 1 : 0
          }}
        >
          <CommandInput placeholder={t`Rechercher un profil...`} />
          <CommandList>
            <CommandEmpty>
              <Trans>Aucun profil trouvé.</Trans>
            </CommandEmpty>
            <CommandGroup>
              {profiles.map((profile) => {
                return (
                  <CommandItem
                    className="group/command-item"
                    key={profile.id}
                    onSelect={(currentValue) => {
                      setConf.mutate({
                        ...conf.data,
                        profileInUse: currentValue,
                      })
                    }}
                    value={profile.id}
                  >
                    <div className="flex w-full items-center gap-1">
                      <span>{profile.name}</span>
                      <Button
                        className="invisible group-hover/command-item:visible"
                        onClick={(e) => {
                          e.preventDefault()
                          e.stopPropagation()
                          setEditProfileNameId(profile.id)
                          setOpenProfileEditNameDialog(true)
                        }}
                        size="icon-sm"
                        variant="ghost"
                      >
                        <PenIcon />
                      </Button>
                    </div>
                    <CheckIcon
                      className={cn('ml-2 size-4', currentProfile.id === profile.id ? 'opacity-100' : 'opacity-0')}
                    />
                    <Button
                      disabled={profiles.length <= 1}
                      onClick={(evt) => {
                        evt.stopPropagation()

                        setOpenProfileDeleteDialog(true)
                        setProfileDeletionOpenId(profile.id)
                      }}
                      size="icon-sm"
                      variant="destructive"
                    >
                      <TrashIcon />
                    </Button>
                  </CommandItem>
                )
              })}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  )
}
