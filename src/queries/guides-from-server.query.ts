import { Status } from '@/ipc/bindings.ts'
import { getGuidesFromServer } from '@/ipc/guides.ts'
import { queryOptions } from '@tanstack/react-query'

export const itemsPerPage = 20

export function guidesFromServerQuery({ status }: { status: Status }) {
  return queryOptions({
    queryKey: ['guides', 'from_server', status],
    queryFn: async () => {
      const result = await getGuidesFromServer(status)

      if (result.isErr()) {
        throw result.error
      }

      return result.value
    },
    staleTime: 1000 * 60,
  })
}
