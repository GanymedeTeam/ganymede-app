import { useMutation, useQueryClient } from '@tanstack/react-query'
import { debug } from '@tauri-apps/plugin-log'
import { Conf } from '@/ipc/bindings.ts'
import { setConf } from '@/ipc/conf.ts'
import { confQuery } from '@/queries/conf.query.ts'

export function useSetConf() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (conf: Conf) => {
      await debug(`set the conf: ${JSON.stringify(conf, undefined, 2)}`)

      const result = await setConf(conf)

      if (result.isErr()) {
        throw result.error
      }
    },
    onMutate(conf: Conf) {
      const previous = queryClient.getQueryData(confQuery.queryKey)
      queryClient.setQueryData(confQuery.queryKey, () => conf)
      return previous
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries(confQuery)
    },
    onError: (_err, _vars, context) => {
      queryClient.setQueryData(confQuery.queryKey, context)
    },
  })
}
