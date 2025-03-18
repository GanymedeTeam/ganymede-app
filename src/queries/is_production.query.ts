import { isProduction } from '@/ipc/is_production.ts'
import { queryOptions } from '@tanstack/react-query'

export const isProductionQuery = queryOptions({
  queryKey: ['app', 'isProduction'],
  queryFn: async () => {
    const res = await isProduction()

    if (res.isErr()) {
      throw res.error
    }

    return res.value
  },
})
