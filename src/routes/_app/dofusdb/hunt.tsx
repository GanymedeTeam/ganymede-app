import { useSuspenseQuery } from '@tanstack/react-query'
import { createFileRoute } from '@tanstack/react-router'
import { getLang } from '@/lib/conf.ts'
import { confQuery } from '@/queries/conf.query.ts'

export const Route = createFileRoute('/_app/dofusdb/hunt')({
  component: () => {
    const conf = useSuspenseQuery(confQuery)
    const lang = getLang(conf.data.lang).toLowerCase()

    return (
      <iframe
        src={`https://dofusdb.fr/${lang}/tools/treasure-hunt`}
        className="size-full grow"
        allow="clipboard-write"
      />
    )
  },
})
