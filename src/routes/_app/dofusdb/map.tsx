import { useSuspenseQuery } from '@tanstack/react-query'
import { createFileRoute } from '@tanstack/react-router'
import { getLang } from '@/lib/conf.ts'
import { confQuery } from '@/queries/conf.query.ts'

export const Route = createFileRoute('/_app/dofusdb/map')({
  component: () => {
    const conf = useSuspenseQuery(confQuery)
    const lang = getLang(conf.data.lang).toLowerCase()

    return <iframe allow="clipboard-write" className="size-full grow" src={`https://dofusdb.fr/${lang}/tools/map`} />
  },
})
