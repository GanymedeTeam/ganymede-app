import { updateAllAtOnce } from '@/ipc/guides.ts'
import { guidesQuery } from '@/queries/guides.query.ts'
import { hasGuidesNotUpdatedQuery } from '@/queries/has_guides_not_updated.query.ts'
import { summaryQuery } from '@/queries/summary.query.ts'
import { UseMutationOptions, useMutation, useQueryClient } from '@tanstack/react-query'
import { ResultAsync } from 'neverthrow'

/**
 * Get the Data from the ResultAsync
 */
// biome-ignore lint/suspicious/noExplicitAny: needed
type ResultAsyncData<T> = T extends ResultAsync<infer R, any> ? R : never

/**
 * Get the Error from the ResultAsync
 */
// biome-ignore lint/suspicious/noExplicitAny: needed
type ResultAsyncError<T> = T extends ResultAsync<any, infer R> ? R : never

export function useUpdateAllAtOnce(
  options: UseMutationOptions<
    ResultAsyncData<ReturnType<typeof updateAllAtOnce>>,
    ResultAsyncError<ReturnType<typeof updateAllAtOnce>>
  > = {},
) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async () => {
      const result = await updateAllAtOnce()

      if (result.isErr()) {
        throw result.error
      }

      await queryClient.invalidateQueries(guidesQuery())
      await queryClient.invalidateQueries(hasGuidesNotUpdatedQuery)
      await queryClient.invalidateQueries({
        queryKey: ['guides', 'summary'],
      })

      for (const [guideId, res] of Object.entries(result.value)) {
        // null means that everything is now up to date
        if (res === null) {
          await queryClient.invalidateQueries(summaryQuery(Number(guideId)))
        }
      }

      return result.value
    },
    ...options,
  })
}
