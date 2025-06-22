import { useMutation } from '@tanstack/react-query'
import { debug } from '@tauri-apps/plugin-log'
import { newId } from '@/ipc/base.ts'

export function useNewId() {
  return useMutation({
    mutationFn: async () => {
      await debug('generate a new id')

      const result = await newId()

      if (result.isErr()) {
        throw result.error
      }

      return result.value
    },
  })
}
