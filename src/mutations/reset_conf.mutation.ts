import { useMutation } from '@tanstack/react-query'
import { resetConf } from '@/ipc/conf.ts'

export function useResetConf() {
  return useMutation({
    mutationFn: async () => {
      const result = await resetConf()

      if (result.isErr()) {
        throw result.error
      }
    },
  })
}
