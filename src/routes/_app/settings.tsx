import { Trans, useLingui } from '@lingui/react/macro'
import { useSuspenseQuery } from '@tanstack/react-query'
import { createFileRoute } from '@tanstack/react-router'
import { useDebounce } from '@uidotdev/usehooks'
import { TriangleAlertIcon } from 'lucide-react'
import { type PropsWithChildren, type ReactNode, useEffect, useState } from 'react'
import { toast } from 'sonner'
import { z } from 'zod'
import { GenericLoader } from '@/components/generic_loader.tsx'
import { PageScrollableContent } from '@/components/page_scrollable_content.tsx'
import { SelectLangLabel, SelectLangSelect } from '@/components/select_lang.tsx'
import { ShortcutInput } from '@/components/shortcut_input.tsx'
import { ThemeSelector } from '@/components/theme_selector.tsx'
import { Button } from '@/components/ui/button.tsx'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card.tsx'
import { Input } from '@/components/ui/input.tsx'
import { Label } from '@/components/ui/label.tsx'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select.tsx'
import { Slider } from '@/components/ui/slider.tsx'
import { Switch } from '@/components/ui/switch.tsx'
import { ConfLang, FontSize } from '@/ipc/bindings.ts'
import { cn } from '@/lib/utils.ts'
import { useNewId } from '@/mutations/new_id.mutation.ts'
import { useReregisterShortcuts } from '@/mutations/reregister_shortcuts.mutation.ts'
import { useSetConf } from '@/mutations/set_conf.mutation.ts'
import { confQuery } from '@/queries/conf.query.ts'
import { Profiles } from '@/routes/_app/-settings/profiles.tsx'
import { Page } from '@/routes/-page.tsx'
import { BackButtonLink } from './downloads/-back_button_link.tsx'

const SearchZod = z.object({
  from: z.string().optional(),
  hash: z.string().optional(),
  state: z.any().optional(),
  search: z.any().optional(),
})

export const Route = createFileRoute('/_app/settings')({
  validateSearch: SearchZod.parse,
  component: Settings,
  loader: async ({ context }) => {
    await context.queryClient.ensureQueryData(confQuery)
  },
  pendingComponent: () => {
    const { t } = useLingui()

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

function SettingCard({
  title,
  description,
  id,
  className,
  children,
}: PropsWithChildren<{ title: ReactNode; description?: ReactNode; id: string; className?: string }>) {
  return (
    <Card className={cn('flex flex-col gap-2 text-sm', className)}>
      <CardHeader className="xs:pb-2">
        <CardTitle>{title}</CardTitle>
        {description && <CardDescription>{description}</CardDescription>}
      </CardHeader>
      <CardContent id={id} className="flex flex-col gap-4 xs:pt-2">
        {children}
      </CardContent>
    </Card>
  )
}

function SettingCardSection({ id, children }: PropsWithChildren<{ id: string }>) {
  return (
    <section id={id} className="flex flex-col gap-2">
      {children}
    </section>
  )
}

function Settings() {
  const { t } = useLingui()
  const { from, hash, state, search } = Route.useSearch()
  const newId = useNewId()
  const conf = useSuspenseQuery(confQuery)
  const setConf = useSetConf()
  const reregisterShortcuts = useReregisterShortcuts()
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
    <Page
      key="settings-page"
      title={t`Paramètres`}
      backButton={<BackButtonLink from={Route.fullPath} to={from} state={state} hash={hash} search={search} />}
    >
      <PageScrollableContent className="py-2">
        <div className="container flex max-w-lg flex-col gap-4 px-4 py-2">
          <SettingCard title={<Trans>Général</Trans>} id="section-general">
            <SettingCardSection id="section-auto-open-guides">
              <div className="flex items-center justify-between gap-2">
                <Label htmlFor="auto-open-guides" className="text-xs">
                  <Trans>Ouvrir les guides à l'ouverture</Trans>
                </Label>
                <Switch
                  id="auto-open-guides"
                  checked={conf.data.autoOpenGuides}
                  onCheckedChange={(checked) => {
                    setConf.mutate({
                      ...conf.data,
                      autoOpenGuides: checked,
                    })
                  }}
                />
              </div>
            </SettingCardSection>
            <SettingCardSection id="section-auto-travel-copy">
              <div className="flex items-center justify-between gap-2">
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
              </div>
            </SettingCardSection>
            <SettingCardSection id="section-show-done-guides">
              <div className="flex items-center justify-between gap-2">
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
              </div>
            </SettingCardSection>
          </SettingCard>
          <SettingCard title={<Trans>Apparence</Trans>} id="section-appearance">
            <SettingCardSection id="section-opacity">
              <Label htmlFor="opacity" className="text-xs">
                <Trans>Opacité</Trans>
              </Label>
              <Slider
                id="opacity"
                defaultValue={[conf.data.opacity * 100]}
                step={1}
                max={98}
                onValueChange={(v) => {
                  setOpacity(v[0] / 100)
                }}
              />
            </SettingCardSection>
            <SettingCardSection id="section-font-size">
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
                    <Trans>Normale</Trans>
                  </SelectItem>
                  <SelectItem value="Large">
                    <Trans>Grande</Trans>
                  </SelectItem>
                  <SelectItem value="ExtraLarge">
                    <Trans>Très grande</Trans>
                  </SelectItem>
                </SelectContent>
              </Select>
            </SettingCardSection>
            <SettingCardSection id="section-lang">
              <SelectLangLabel htmlFor="lang-guides" />
              <SelectLangSelect
                value={conf.data.lang}
                onValueChange={async (value) => {
                  setConf.mutate({
                    ...conf.data,
                    lang: value as ConfLang,
                  })
                }}
              />
            </SettingCardSection>
            <SettingCardSection id="section-theme">
              <ThemeSelector />
            </SettingCardSection>
          </SettingCard>
          <SettingCard
            id="section-shortcuts"
            className="slot-[card-content]:pt-0 slot-[card-description]:text-xs"
            title={<Trans>Raccourcis clavier</Trans>}
            description={
              <Trans>
                Note : Les raccourcis déjà utilisés par d'autres applications (AMD Adrenalin, Nvidia App, etc.) ne
                peuvent pas être enregistrés. Supprimez-les d'abord dans ces applications.
              </Trans>
            }
          >
            <SettingCardSection id="section-shortcuts-inputs">
              <ShortcutInput
                id="reset-conf"
                label={t`Réinitialiser la configuration`}
                description={t`Efface tous vos profils et paramètres (pas les guides)`}
                value={conf.data.shortcuts?.resetConf}
                onChange={async (value) => {
                  try {
                    await setConf.mutateAsync({
                      ...conf.data,
                      shortcuts: {
                        ...conf.data.shortcuts,
                        resetConf: value,
                      },
                    })
                    await reregisterShortcuts.mutateAsync()
                    toast.success(t`Raccourci mis à jour`)
                  } catch {
                    toast.error(t`Erreur lors de la mise à jour du raccourci`)
                  }
                }}
              />
              <ShortcutInput
                id="go-previous-step"
                label={t`Étape précédente`}
                value={conf.data.shortcuts?.goPreviousStep}
                onChange={async (value) => {
                  try {
                    await setConf.mutateAsync({
                      ...conf.data,
                      shortcuts: {
                        ...conf.data.shortcuts,
                        goPreviousStep: value,
                      },
                    })
                    await reregisterShortcuts.mutateAsync()
                    toast.success(t`Raccourci mis à jour`)
                  } catch {
                    toast.error(t`Erreur lors de la mise à jour du raccourci`)
                  }
                }}
              />
              <ShortcutInput
                id="go-next-step"
                label={t`Étape suivante`}
                value={conf.data.shortcuts?.goNextStep}
                onChange={async (value) => {
                  try {
                    await setConf.mutateAsync({
                      ...conf.data,
                      shortcuts: {
                        ...conf.data.shortcuts,
                        goNextStep: value,
                      },
                    })
                    await reregisterShortcuts.mutateAsync()
                    toast.success(t`Raccourci mis à jour`)
                  } catch {
                    toast.error(t`Erreur lors de la mise à jour du raccourci`)
                  }
                }}
              />
              <ShortcutInput
                id="copy-current-step"
                label={t`Copier l'étape actuelle`}
                value={conf.data.shortcuts?.copyCurrentStep}
                onChange={async (value) => {
                  try {
                    await setConf.mutateAsync({
                      ...conf.data,
                      shortcuts: {
                        ...conf.data.shortcuts,
                        copyCurrentStep: value,
                      },
                    })
                    await reregisterShortcuts.mutateAsync()
                    toast.success(t`Raccourci mis à jour`)
                  } catch {
                    toast.error(t`Erreur lors de la mise à jour du raccourci`)
                  }
                }}
              />
            </SettingCardSection>
          </SettingCard>
          <SettingCard title={<Trans>Profils</Trans>} id="section-profiles-card">
            <SettingCardSection id="section-profiles">
              <div className="w-full">
                <Profiles />
              </div>
            </SettingCardSection>
            <SettingCardSection id="section-create-profile">
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
                    const id = await newId.mutateAsync()

                    await setConf.mutateAsync({
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

                    toast.success(t`Profil créé avec succès`)

                    form.newProfile.value = ''
                  } else {
                    toast.error(t`Erreur lors de la création du profil. Vérifiez le nom du profil (nom unique).`)
                  }
                }}
              >
                <Input id="create-profile" name="newProfile" className="h-9" />
                <Button type="submit">
                  <span>
                    <Trans>Créer</Trans>
                  </span>
                  {newId.isError && <TriangleAlertIcon className="text-red-500" />}
                </Button>
              </form>
            </SettingCardSection>
          </SettingCard>
        </div>
      </PageScrollableContent>
    </Page>
  )
}
