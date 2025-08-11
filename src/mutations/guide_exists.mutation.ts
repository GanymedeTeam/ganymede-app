import { useMutation } from '@tanstack/react-query'
import { Guide } from '@/ipc/bindings.ts'
import { guideExists } from '@/ipc/guides.ts'

export function useGuideExists() {
  return useMutation({
    mutationFn: async ({ guide }: { guide: Pick<Guide, 'id'> }) => {
      const result = await guideExists(guide.id)

      if (result.isErr()) {
        throw result.error
      }

      return result.value
    },
  })
}
