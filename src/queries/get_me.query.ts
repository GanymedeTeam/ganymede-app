import { queryOptions } from '@tanstack/react-query'
import { info } from '@tauri-apps/plugin-log'
import { User } from '@/ipc/bindings.ts'
import { GetMeError, getMe } from '@/ipc/user.ts'

export const getMeQuery = queryOptions<User, GetMeError>({
  queryKey: ['auth', 'me'],
  queryFn: async () => {
    const user = await getMe()

    if (user.isErr()) {
      throw user.error
    }

    info(`[GetMe] Successfully fetched user: ${JSON.stringify(user.value, undefined, 2)}`)

    return user.value
  },
})
