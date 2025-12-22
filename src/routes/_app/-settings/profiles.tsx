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
      open={open}
      onOpenChange={(open) => {
        setOpen(open)

        if (!openProfileEditNameDialog) {
          setEditProfileNameId(null)
        }
      }}
    >
      <PopoverTrigger asChild>
        <Button role="combobox" aria-expanded={open} className={selectVariants()}>
          {currentProfile?.name ?? 'Select profile'}
          <ChevronsUpDownIcon className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <ProfileEditNameDialog
        profileId={profileEditNameId}
        open={openProfileEditNameDialog}
        onOpenChange={(open) => {
          if (!open) {
            setTimeout(() => {
              setEditProfileNameId(null)
            }, 500)
          }

          setOpenProfileEditNameDialog(open)
        }}
      />
      <ProfileDeleteDialog
        profileId={profileDeletionOpenId}
        open={openProfileDeleteDialog}
        onDelete={async (profileId) => {
          const index = profiles.findIndex((p) => p.id === profileId)
          const nextProfileToUse =
            conf.data.profileInUse === profileId
              ? (profiles.at(index - 1)?.id ?? conf.data.profileInUse)
              : conf.data.profileInUse

          await setConf.mutateAsync({
            ...conf.data,
            profiles: profiles.filter((p) => p.id !== profileId),
            profileInUse: nextProfileToUse,
          })

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
                    key={profile.id}
                    value={profile.id}
                    onSelect={(currentValue) => {
                      setConf.mutate({
                        ...conf.data,
                        profileInUse: currentValue,
                      })
                    }}
                    className="group/command-item"
                  >
                    <div className="flex w-full items-center gap-1">
                      <span>{profile.name}</span>
                      <Button
                        size="icon-sm"
                        variant="ghost"
                        className="invisible group-hover/command-item:visible"
                        onClick={(e) => {
                          e.preventDefault()
                          e.stopPropagation()
                          setEditProfileNameId(profile.id)
                          setOpenProfileEditNameDialog(true)
                        }}
                      >
                        <PenIcon />
                      </Button>
                    </div>
                    <CheckIcon
                      className={cn('ml-2 size-4', currentProfile.id === profile.id ? 'opacity-100' : 'opacity-0')}
                    />
                    <Button
                      size="icon-sm"
                      variant="destructive"
                      disabled={profiles.length <= 1}
                      onClick={(evt) => {
                        evt.stopPropagation()

                        setOpenProfileDeleteDialog(true)
                        setProfileDeletionOpenId(profile.id)
                      }}
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
