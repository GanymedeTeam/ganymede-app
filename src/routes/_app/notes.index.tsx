import { GenericLoader } from '@/components/generic-loader'
import { PageScrollableContent } from '@/components/page-scrollable-content'
import { Button } from '@/components/ui/button'
import { useSetConf } from '@/mutations/set-conf.mutation'
import { confQuery } from '@/queries/conf.query'
import { useLingui } from '@lingui/react/macro'
import { useSuspenseQuery } from '@tanstack/react-query'
import { Link, createFileRoute } from '@tanstack/react-router'
import { writeText } from '@tauri-apps/plugin-clipboard-manager'
import { CopyIcon, PlusIcon, TrashIcon } from 'lucide-react'
import { Page } from '@/routes/-page'

export const Route = createFileRoute('/_app/notes/')({
  component: NotesPage,
  loader: async ({ context }) => {
    await context.queryClient.ensureQueryData(confQuery)
  },
  pendingComponent: () => {
    const { t } = useLingui()

    return (
      <Page
        key="notes-page"
        title={t`Notes`}
        actions={
          <div className="flex w-full items-center justify-end gap-1 text-sm">
            <Button size="icon-sm" variant="secondary" disabled>
              <PlusIcon />
            </Button>
          </div>
        }
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
      key="notes-page"
      title={t`Notes`}
      actions={
        <div className="flex w-full items-center justify-end gap-1 text-sm">
          <Button
            size="icon-sm"
            variant="secondary"
            asChild
            title={t`Créer une nouvelle note`}
            className="size-6 min-h-6 min-w-6 sm:size-7 sm:min-h-7 sm:min-w-7"
          >
            <Link to="/notes/create" search={{}} draggable={false}>
              <PlusIcon />
            </Link>
          </Button>
        </div>
      }
    >
      <PageScrollableContent className="p-2">
        <ul className="flex flex-col gap-2">
          {conf.data.notes.map((note) => {
            return (
              <li key={note.name} className="flex w-full justify-between gap-2">
                <Button asChild className="grow" title={t`Modifier la note`}>
                  <Link to="/notes/create" search={{ name: note.name }} draggable={false}>
                    <p className="text-slate-300">{note.name}</p>
                  </Link>
                </Button>
                <Button
                  type="button"
                  size="icon"
                  onClick={async () => {
                    await writeText(note.text)
                  }}
                  title={t`Copier la note`}
                >
                  <CopyIcon />
                </Button>
                <Button
                  type="button"
                  size="icon"
                  variant="destructive"
                  onClick={() => {
                    setConf.mutate({
                      ...conf.data,
                      notes: conf.data.notes.filter((pilot) => pilot.name !== note.name),
                    })
                  }}
                  title={t`Supprimer de la liste`}
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
