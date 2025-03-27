import { openUrlInBrowser } from '@/ipc/base.ts'
import { useMutation } from '@tanstack/react-query'

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
