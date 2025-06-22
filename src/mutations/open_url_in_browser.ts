import { useMutation } from '@tanstack/react-query'
import { openUrlInBrowser } from '@/ipc/base.ts'

export function useOpenUrlInBrowser() {
  return useMutation({
    mutationFn: async (href: string) => {
      const result = await openUrlInBrowser(href)

      if (result.isErr()) {
        throw result.error
      }
    },
  })
}
