import { useMutation } from '@tanstack/react-query'
import { registerGuideClose } from '@/ipc/guides.ts'

export function useRegisterGuideClose() {
  return useMutation({
    mutationFn: async ({ guideId, profileId }: { guideId: number; profileId: string }) => {
      const result = await registerGuideClose(guideId, profileId)

      if (result.isErr()) {
        throw result.error
      }
    },
  })
}
