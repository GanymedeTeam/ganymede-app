import { useLingui } from '@lingui/react/macro'
import { useSuspenseQuery } from '@tanstack/react-query'
import { createFileRoute } from '@tanstack/react-router'
import { CopyIcon, PlusIcon, TrashIcon } from 'lucide-react'
import { BottomBar } from '@/components/bottom_bar.tsx'
import { GenericLoader } from '@/components/generic_loader.tsx'
import { PageScrollableContent } from '@/components/page_scrollable_content.tsx'
import { Button } from '@/components/ui/button.tsx'
import { Input } from '@/components/ui/input.tsx'
import { copyPosition } from '@/lib/copy_position.ts'
import { useSetConf } from '@/mutations/set_conf.mutation.ts'
import { confQuery } from '@/queries/conf.query.ts'
import { Page } from '@/routes/-page.tsx'

export const Route = createFileRoute('/_app/auto-pilot')({
  component: AutoPilotPage,
  loader: async ({ context }) => {
    await context.queryClient.ensureQueryData(confQuery)
  },
  pendingComponent: () => {
    const { t } = useLingui()

    return (
      <Page key="auto-pilot-page" title={t`Autopilotage`}>
        <PageScrollableContent className="flex items-center justify-center" hasBottomBar>
          <GenericLoader />

          <BottomBar>
            <Input className="placeholder:italic" disabled name="name" placeholder={t`Nom`} />
            <Input className="placeholder:italic" disabled name="position" placeholder="2,-30" />
            <Button className="min-w-6 sm:min-w-9" disabled size="icon" type="button" variant="secondary">
              <PlusIcon />
            </Button>
          </BottomBar>
        </PageScrollableContent>
      </Page>
    )
  },
  pendingMs: 200,
})

function AutoPilotPage() {
  const conf = useSuspenseQuery(confQuery)
  const setConf = useSetConf()
  const { t } = useLingui()

  return (
    <Page key="auto-pilot-page" title={t`Autopilotage`}>
      <PageScrollableContent className="p-2" hasBottomBar>
        <ul className="flex flex-col gap-2">
          {conf.data.autoPilots.map((autoPilot) => {
            return (
              <li className="flex w-full justify-between gap-2" key={autoPilot.name}>
                <div className="flex items-center gap-1">
                  <Button
                    onClick={async () => {
                      const [x, y] = autoPilot.position.split(',').map((n) => Number.parseInt(n, 10))
                      await copyPosition(x, y, conf.data.autoTravelCopy)
                    }}
                    size="icon"
                    title={conf.data.autoTravelCopy ? t`Copier la commande autopilote` : t`Copier la position`}
                    type="button"
                  >
                    <CopyIcon />
                  </Button>
                  <p className="font-semibold">[{autoPilot.position}]</p>
                  <p className="text-slate-300">{autoPilot.name}</p>
                </div>
                <Button
                  onClick={() => {
                    setConf.mutate({
                      ...conf.data,
                      autoPilots: conf.data.autoPilots.filter((pilot) => pilot.name !== autoPilot.name),
                    })
                  }}
                  size="icon"
                  title={t`Supprimer de la liste`}
                  type="button"
                  variant="destructive"
                >
                  <TrashIcon />
                </Button>
              </li>
            )
          })}
        </ul>

        <BottomBar asChild>
          <form
            onSubmit={(evt) => {
              evt.preventDefault()
              const target = evt.target as HTMLFormElement
              const data = new FormData(target)

              const name = (data.get('name') as string).trim()
              const position = (data.get('position') as string).trim().replace(/\[?\]?/g, '')

              const pilot = conf.data.notes.find((pilot) => pilot.name === name)

              setConf.mutate({
                ...conf.data,
                autoPilots: pilot
                  ? conf.data.autoPilots.map((autoPilot) => {
                      if (autoPilot.name === name) {
                        return { name, position }
                      }

                      return autoPilot
                    })
                  : [...conf.data.autoPilots, { name, position }],
              })

              target.reset()
            }}
          >
            <Input
              className="placeholder:italic"
              maxLength={20}
              minLength={2}
              name="name"
              placeholder={t`Nom`}
              required
            />
            <Input
              className="placeholder:italic"
              maxLength={11}
              name="position"
              pattern="\[?-?\d+,-?\d+\]?"
              placeholder="2,-30"
              required
            />
            <Button className="min-w-6 sm:min-w-9" size="icon" title={t`Ajouter`} type="submit" variant="secondary">
              <PlusIcon />
            </Button>
          </form>
        </BottomBar>
      </PageScrollableContent>
    </Page>
  )
}
