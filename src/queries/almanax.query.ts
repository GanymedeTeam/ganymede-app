import { queryOptions } from '@tanstack/react-query'
import { type Dayjs } from 'dayjs'
import { getAlmanax } from '@/ipc/almanax.ts'
import { ConfLang } from '@/ipc/bindings.ts'

export const almanaxQuery = (lang: ConfLang, level: number, date: Dayjs) => {
  return queryOptions({
    queryKey: ['almanax', lang, level, date.format('YYYY-MM-DD HH:mm:ss')],
    queryFn: async () => {
      const res = await getAlmanax(level, date.toISOString())

      if (res.isErr()) {
        throw res.error
      }

      return res.value
    },
  })
}
