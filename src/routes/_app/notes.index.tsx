import { useLingui } from '@lingui/react/macro'
import { useSuspenseQuery } from '@tanstack/react-query'
import { createFileRoute, Link } from '@tanstack/react-router'
import { writeText } from '@tauri-apps/plugin-clipboard-manager'
import { CopyIcon, PlusIcon, TrashIcon } from 'lucide-react'
import { GenericLoader } from '@/components/generic_loader.tsx'
import { PageScrollableContent } from '@/components/page_scrollable_content.tsx'
import { Button } from '@/components/ui/button.tsx'
import { useSetConf } from '@/mutations/set_conf.mutation.ts'
import { confQuery } from '@/queries/conf.query.ts'
import { Page } from '@/routes/-page.tsx'

export const Route = createFileRoute('/_app/notes/')({
  component: NotesPage,
  loader: async ({ context }) => {
    await context.queryClient.ensureQueryData(confQuery)
  },
  pendingComponent: () => {
    const { t } = useLingui()

    return (
      <Page
        actions={
          <div className="flex w-full items-center justify-end gap-1 text-sm">
            <Button disabled size="icon-sm" variant="secondary">
              <PlusIcon />
            </Button>
          </div>
        }
        key="notes-page"
        title={t`Notes`}
      >
        <PageScrollableContent className="flex items-center justify-center">
          <GenericLoader />
        </PageScrollableContent>
      </Page>
    )
  },
  pendingMs: 200,
})

function NotesPage() {
  const { t } = useLingui()
  const conf = useSuspenseQuery(confQuery)
  const setConf = useSetConf()

  return (
    <Page
      actions={
        <div className="flex w-full items-center justify-end gap-1 text-sm">
          <Button
            asChild
            className="size-6 min-h-6 min-w-6 sm:size-7 sm:min-h-7 sm:min-w-7"
            size="icon-sm"
            title={t`Créer une nouvelle note`}
            variant="secondary"
          >
            <Link draggable={false} search={{}} to="/notes/create">
              <PlusIcon />
            </Link>
          </Button>
        </div>
      }
      key="notes-page"
      title={t`Notes`}
    >
      <PageScrollableContent className="p-2">
        <ul className="flex flex-col gap-2">
          {conf.data.notes.map((note) => {
            return (
              <li className="flex w-full justify-between gap-2" key={note.name}>
                <Button asChild className="grow" title={t`Modifier la note`}>
                  <Link draggable={false} search={{ name: note.name }} to="/notes/create">
                    <p className="text-slate-300">{note.name}</p>
                  </Link>
                </Button>
                <Button
                  onClick={async () => {
                    await writeText(note.text)
                  }}
                  size="icon"
                  title={t`Copier la note`}
                  type="button"
                >
                  <CopyIcon />
                </Button>
                <Button
                  onClick={() => {
                    setConf.mutate({
                      ...conf.data,
                      notes: conf.data.notes.filter((pilot) => pilot.name !== note.name),
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
      </PageScrollableContent>
    </Page>
  )
}
