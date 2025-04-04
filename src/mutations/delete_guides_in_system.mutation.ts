import { GuideOrFolderToDelete } from '@/ipc/bindings.ts'
import { deleteGuidesFromSystem } from '@/ipc/guides.ts'
import { useMutation } from '@tanstack/react-query'

export function useDeleteGuidesInSystem() {
  return useMutation({
    mutationFn: async (guidesAndFolder: GuideOrFolderToDelete[]) => {
      const result = await deleteGuidesFromSystem(guidesAndFolder)

      if (result.isErr()) {
        throw result.error
      }
    },
  })
}
