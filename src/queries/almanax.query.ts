import { getAlmanax } from '@/ipc/almanax.ts'
import { ConfLang } from '@/ipc/bindings.ts'
import { queryOptions } from '@tanstack/react-query'
import dayjs, { type Dayjs } from 'dayjs'
import { newDateFromParis } from '../lib/date'

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
    // staleTime is set until the next almanax
    staleTime: newDateFromParis().add(1, 'day').diff(dayjs.tz(undefined, 'Europe/Paris'), 'millisecond'),
  })
}
