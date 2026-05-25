import { useSuspenseQuery } from '@tanstack/react-query'
import { createFileRoute } from '@tanstack/react-router'

import { getLang } from '@/lib/conf.ts'
import { confQuery } from '@/queries/conf.query.ts'

function DofusDbHuntPage() {
  const conf = useSuspenseQuery(confQuery)
  const lang = getLang(conf.data.lang).toLowerCase()

  return (
    <iframe allow="clipboard-write" className="size-full grow" src={`https://dofusdb.fr/${lang}/tools/treasure-hunt`} />
  )
}

export const Route = createFileRoute('/_app/dofusdb/hunt')({
  component: DofusDbHuntPage,
})
