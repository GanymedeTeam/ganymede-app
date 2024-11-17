import { GenericLoader } from '@/components/generic-loader.tsx'
import { PageScrollableContent } from '@/components/page-scrollable-content'
import { Button } from '@/components/ui/button.tsx'
import { Input } from '@/components/ui/input.tsx'
import { Label } from '@/components/ui/label.tsx'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select.tsx'
import { Slider } from '@/components/ui/slider'
import { Switch } from '@/components/ui/switch.tsx'
import { dynamicActiveLocale } from '@/i18n'
import { newId } from '@/ipc/id.ts'
import { useSetConf } from '@/mutations/set-conf.mutation.ts'
import { confQuery } from '@/queries/conf.query.ts'
import { Page } from '@/routes/-page.tsx'
import { FontSize, Lang } from '@/types/conf.ts'
import { Trans, t } from '@lingui/macro'
import { useSuspenseQuery } from '@tanstack/react-query'
import { createFileRoute } from '@tanstack/react-router'
import { useDebounce } from '@uidotdev/usehooks'
import { useEffect, useState } from 'react'

export const Route = createFileRoute('/_app/settings')({
  component: Settings,
  loader: async ({ context }) => {
    await context.queryClient.ensureQueryData(confQuery)
  },
  pendingComponent: () => {
    return (
      <Page key="settings-page" title={t`Paramètres`}>
        <PageScrollableContent className="flex items-center justify-center">
          <GenericLoader />
        </PageScrollableContent>
      </Page>
    )
  },
  pendingMs: 200,
})

function Settings() {
  const conf = useSuspenseQuery(confQuery)
  const setConf = useSetConf()
  const [opacity, setOpacity] = useState(conf.data.opacity)
  const opacityDebounced = useDebounce(opacity, 300)

  // biome-ignore lint/correctness/useExhaustiveDependencies: no need more deps
  useEffect(() => {
    setConf.mutate({
      ...conf.data,
      opacity: opacityDebounced,
    })
  }, [opacityDebounced])

  useEffect(() => {
    window.document.documentElement.style.setProperty('--opacity', `${opacity.toFixed(2)}`)
  }, [opacity])

  return (
    <Page key="settings-page" title={t`Paramètres`}>
      <PageScrollableContent className="py-2">
        <div className="container flex flex-col gap-4 text-sm">
          <section className="flex flex-col gap-2">
            <Label htmlFor="opacity" className="text-xs">
              <Trans>Opacité</Trans>
            </Label>
            <Slider
              id="opacity"
              defaultValue={[conf.data.opacity * 100]}
              step={1}
              max={93}
              onValueChange={(v) => {
                setOpacity(v[0] / 100)
              }}
            />
          </section>
          <section className="flex flex-col gap-2">
            <p className="font-medium text-xs leading-none">
              <Trans>Taille de texte des guides</Trans>
            </p>
            <Select
              value={conf.data.fontSize}
              onValueChange={(value) => {
                setConf.mutate({
                  ...conf.data,
                  fontSize: value as FontSize,
                })
              }}
            >
              <SelectTrigger id="lang-guides" className="text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ExtraSmall">
                  <Trans>Très petite</Trans>
                </SelectItem>
                <SelectItem value="Small">
                  <Trans>Petite</Trans>
                </SelectItem>
                <SelectItem value="Normal">
                  <Trans>Normal</Trans>
                </SelectItem>
                <SelectItem value="Large">
                  <Trans>Grande</Trans>
                </SelectItem>
                <SelectItem value="ExtraLarge">
                  <Trans>Très grande</Trans>
                </SelectItem>
              </SelectContent>
            </Select>
          </section>
          <section className="flex items-center justify-between gap-2">
            <Label htmlFor="auto-travel-copy" className="text-xs">
              <Trans>Copie d'autopilote</Trans>
            </Label>
            <Switch
              id="auto-travel-copy"
              checked={conf.data.autoTravelCopy}
              onCheckedChange={(checked) => {
                setConf.mutate({
                  ...conf.data,
                  autoTravelCopy: checked,
                })
              }}
            />
          </section>
          <section className="flex items-center justify-between gap-2">
            <Label htmlFor="show-done-guides" className="text-xs">
              <Trans>Afficher les guides terminés</Trans>
            </Label>
            <Switch
              id="show-done-guides"
              checked={conf.data.showDoneGuides}
              onCheckedChange={(checked) => {
                setConf.mutate({
                  ...conf.data,
                  showDoneGuides: checked,
                })
              }}
            />
          </section>
          <section className="space-y-2">
            <Label htmlFor="lang-guides" className="text-xs">
              <Trans>Langue</Trans>
            </Label>
            <Select
              value={conf.data.lang}
              onValueChange={async (value) => {
                setConf.mutate({
                  ...conf.data,
                  lang: value as Lang,
                })
                await dynamicActiveLocale(value.toLowerCase())
              }}
            >
              <SelectTrigger id="lang-guides" className="text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Fr">Français</SelectItem>
                <SelectItem value="En">English</SelectItem>
                <SelectItem value="Es">Español</SelectItem>
                <SelectItem value="Pt">Português</SelectItem>
              </SelectContent>
            </Select>
          </section>
          <section className="space-y-2">
            <Label htmlFor="profiles" className="text-xs">
              <Trans>Profils</Trans>
            </Label>
            <Select
              value={conf.data.profileInUse}
              onValueChange={(value) => {
                setConf.mutate({
                  ...conf.data,
                  profileInUse: value,
                })
              }}
            >
              <SelectTrigger id="profiles" className="text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {conf.data.profiles.map((profile) => {
                  return (
                    <SelectItem key={profile.id} value={profile.id}>
                      {profile.name}
                    </SelectItem>
                  )
                })}
              </SelectContent>
            </Select>
          </section>
          <section className="space-y-2">
            <Label htmlFor="create-profile" className="text-xs">
              <Trans>Créer un profil</Trans>
            </Label>
            <form
              className="space-y-2"
              onSubmit={async (evt) => {
                evt.preventDefault()
                const form = evt.currentTarget

                const profileName = form.newProfile.value as string

                // Check if the profile name is not empty and if it doesn't already exist
                if (profileName.trim() !== '' && !conf.data.profiles.find((p) => p.name === profileName.trim())) {
                  const id = await newId()

                  id.map((id) => {
                    setConf.mutate({
                      ...conf.data,
                      profiles: [
                        ...conf.data.profiles,
                        {
                          id,
                          name: profileName.trim(),
                          progresses: [],
                        },
                      ],
                      profileInUse: id,
                    })

                    form.newProfile.value = ''
                  })
                  // TODO: handle error, but should not happen
                }
              }}
            >
              <Input id="create-profile" name="newProfile" className="" />
              <Button type="submit">
                <Trans>Créer</Trans>
              </Button>
            </form>
          </section>
        </div>
      </PageScrollableContent>
    </Page>
  )
}