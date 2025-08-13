import { Trans, useLingui } from '@lingui/react/macro'
import { rankItem } from '@tanstack/match-sorter-utils'
import { useSuspenseQuery } from '@tanstack/react-query'
import { CheckIcon, ChevronsUpDownIcon, TrashIcon } from 'lucide-react'
import { type MouseEvent, useState } from 'react'
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command.tsx'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover.tsx'
import { useProfile } from '@/hooks/use_profile.ts'
import { getProfileById } from '@/lib/profile.ts'
import { cn } from '@/lib/utils.ts'
import { useSetConf } from '@/mutations/set_conf.mutation.ts'
import { confQuery } from '@/queries/conf.query.ts'
import { ProfileDeleteDialog } from '@/routes/_app/-settings/profile_delete_dialog.tsx'
import { Button } from '@/components/ui/button.tsx'
import { toast } from 'sonner'

export function Profiles() {
  const { t } = useLingui()
  const conf = useSuspenseQuery(confQuery)
  const setConf = useSetConf()
  const profiles = conf.data.profiles
  const currentProfile = useProfile()
  const [open, setOpen] = useState(false)
  const [profileDeletionOpen, setProfileDeletionOpen] = useState(false)

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          role="combobox"
          aria-expanded={open}
          className="flex h-9 w-full cursor-pointer items-center justify-between whitespace-nowrap rounded-md border border-neutral-200 bg-transparent px-3 py-2 text-xs shadow-xs ring-offset-white placeholder:text-neutral-500 focus:outline-hidden focus:ring-1 focus:ring-neutral-950 disabled:cursor-not-allowed disabled:opacity-50 dark:border-neutral-800 dark:ring-offset-neutral-950 dark:focus:ring-neutral-300 dark:placeholder:text-neutral-400 [&>span]:line-clamp-1"
        >
          {currentProfile?.name ?? 'Select profile'}
          <ChevronsUpDownIcon className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </button>
      </PopoverTrigger>
      <PopoverContent className="p-0">
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
                const onClickTrash = async (evt: MouseEvent) => {
                  evt.stopPropagation()
                  const index = profiles.findIndex((p) => p.id === profile.id)
                  const nextProfileToUse =
                    conf.data.profileInUse === profile.id
                      ? (profiles.at(index - 1)?.id ?? conf.data.profileInUse)
                      : conf.data.profileInUse

                  await setConf.mutateAsync({
                    ...conf.data,
                    profiles: profiles.filter((p) => p.id !== profile.id),
                    profileInUse: nextProfileToUse,
                  })

                  toast.success(t`Profil supprimé avec succès`)
                }

                return (
                  <CommandItem
                    key={profile.id}
                    value={profile.id}
                    onSelect={(currentValue) => {
                      setConf.mutate({
                        ...conf.data,
                        profileInUse: currentValue,
                      })
                      // setOpen(false)
                    }}
                  >
                    <span className="w-full">{profile.name}</span>
                    <CheckIcon
                      className={cn('ml-2 size-4', currentProfile.id === profile.id ? 'opacity-100' : 'opacity-0')}
                    />
                    <ProfileDeleteDialog
                      profileName={profile.name}
                      onDelete={onClickTrash}
                      open={profileDeletionOpen}
                      onOpenChange={setProfileDeletionOpen}
                    >
                      <Button size="icon-sm" variant="destructive" disabled={profiles.length <= 1}>
                        <TrashIcon />
                      </Button>
                    </ProfileDeleteDialog>
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
