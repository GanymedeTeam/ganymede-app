import { useMutation } from '@tanstack/react-query'
import { registerGuideClose } from '@/ipc/guides.ts'

export function useRegisterGuideClose() {
  return useMutation({
    mutationFn: async (guideId: number) => {
      const result = await registerGuideClose(guideId)

      if (result.isErr()) {
        throw result.error
      }
    },
  })
}
