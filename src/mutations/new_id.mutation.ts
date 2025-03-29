import { newId } from '@/ipc/base.ts'
import { useMutation } from '@tanstack/react-query'
import { debug } from '@tauri-apps/plugin-log'

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
