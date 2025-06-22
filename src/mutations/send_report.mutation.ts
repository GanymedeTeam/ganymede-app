import { UseMutationResult, useMutation } from '@tanstack/react-query'
import { ReportPayload } from '@/ipc/bindings.ts'
import { ReportError, report } from '@/ipc/report.ts'

export function useReport(): UseMutationResult<void, ReportError, ReportPayload> {
  return useMutation({
    mutationFn: async (payload: ReportPayload) => {
      const result = await report(payload)

      if (result.isErr()) {
        throw result.error
      }
    },
  })
}
