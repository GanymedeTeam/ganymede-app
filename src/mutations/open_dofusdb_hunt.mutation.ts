import { useMutation } from '@tanstack/react-query'

import { openHunt } from '@/ipc/dofusdb.ts'

export function useOpenDofusDbHunt() {
  return useMutation({
    mutationFn: async (lang: string) => {
      const result = await openHunt(lang)

      if (result.isErr()) {
        throw result.error
      }

      return result.value
    },
  })
}
