import { Guide } from '@/ipc/bindings.ts'
import { downloadGuideFromServer } from '@/ipc/guides.ts'
import { guidesQuery } from '@/queries/guides.query.ts'
import { summaryQuery } from '@/queries/summary.query.ts'
import { useMutation, useQueryClient } from '@tanstack/react-query'

export function useDownloadGuideFromServer() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({
      guide,
      folder,
    }: {
      guide: Pick<Guide, 'id'>
      folder: string
    }) => {
      const result = await downloadGuideFromServer(guide.id, folder)

      if (result.isErr()) {
        throw result.error
      }

      await Promise.allSettled([
        queryClient.invalidateQueries(guidesQuery()),
        queryClient.invalidateQueries(summaryQuery(guide.id)),
      ])
    },
  })
}
