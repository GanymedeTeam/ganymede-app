import { useMutation } from '@tanstack/react-query'

import { openMap } from '@/ipc/dofusdb.ts'

export function useOpenDofusDbMap() {
  return useMutation({
    mutationFn: async (lang: string) => {
      const result = await openMap(lang)

      if (result.isErr()) {
        throw result.error
      }

      return result.value
    },
  })
}
