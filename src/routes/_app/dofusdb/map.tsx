import { confQuery } from '@/queries/conf.query.ts'
import { useSuspenseQuery } from '@tanstack/react-query'
import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/_app/dofusdb/map')({
  component: () => {
    const conf = useSuspenseQuery(confQuery)
    const lang = conf.data?.lang.toLowerCase() ?? 'fr'

    return <iframe src={`https://dofusdb.fr/${lang}/tools/map`} className="size-full grow" allow="clipboard-write" />
  },
})
