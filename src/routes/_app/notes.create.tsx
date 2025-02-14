import { PageScrollableContent } from '@/components/page-scrollable-content.tsx'
import { Button } from '@/components/ui/button.tsx'
import { Input } from '@/components/ui/input.tsx'
import { Textarea } from '@/components/ui/textarea.tsx'
import { useSetConf } from '@/mutations/set-conf.mutation.ts'
import { confQuery } from '@/queries/conf.query.ts'
import { Page } from '@/routes/-page.tsx'
import { Trans, useLingui } from '@lingui/react/macro'
import { useSuspenseQuery } from '@tanstack/react-query'
import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { SaveIcon } from 'lucide-react'
import { z } from 'zod'
import { BackButtonLink } from './downloads/-back-button-link.tsx'

const SearchZod = z.object({
  name: z.string().optional(),
})

export const Route = createFileRoute('/_app/notes/create')({
  component: CreateNotePage,
  validateSearch: (search) => SearchZod.parse(search),
})

const linesBreak = '\n\n'

function CreateNotePage() {
  const { t } = useLingui()
  const conf = useSuspenseQuery(confQuery)
  const setConf = useSetConf()
  const navigate = useNavigate()
  const noteName = Route.useSearch({ select: (search) => search.name })

  const note = noteName ? conf.data.notes.find((note) => note.name === noteName) : undefined

  return (
    <Page
      key="create-or-edit-notes-page"
      title={noteName ? t`Éditer une note` : t`Créer une note`}
      backButton={<BackButtonLink to="/notes" />}
    >
      <PageScrollableContent className="p-2">
        <form
          className="flex grow flex-col gap-2"
          onSubmit={async (evt) => {
            evt.preventDefault()
            const target = evt.target as HTMLFormElement
            const data = new FormData(target)

            const name = (data.get('name') as string).trim()
            const text = (data.get('text') as string).trim().replace(/\[?\]?/g, '')

            const note = conf.data.notes.find((note) => note.name === name)

            await setConf.mutateAsync({
              ...conf.data,
              notes: note
                ? conf.data.notes.map((n) => {
                    if (n.name === name) {
                      return { name, text }
                    }

                    return n
                  })
                : [...conf.data.notes, { name, text }],
            })

            await navigate({
              to: '/notes',
            })
          }}
        >
          <Input
            placeholder={t`Nom de la note`}
            name="name"
            className="placeholder:italic"
            required
            minLength={2}
            maxLength={20}
            defaultValue={note?.name}
          />
          <Textarea
            placeholder={t`Contenu de la note.${linesBreak}Depuis le menu précédent, une fois créée, je peux la modifier en cliquant dessus, ou copier son contenu.`}
            name="text"
            className="grow resize-none placeholder:text-xs xs:placeholder:text-sm placeholder:italic"
            required
            autoComplete="off"
            autoCapitalize="off"
            rows={10}
          >
            {note?.text}
          </Textarea>
          <Button type="submit">
            <SaveIcon />
            <Trans>Enregistrer la note</Trans>
          </Button>
        </form>
      </PageScrollableContent>
    </Page>
  )
}
