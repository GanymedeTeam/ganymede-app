import { queryOptions } from '@tanstack/react-query'
import { getVersion } from '@tauri-apps/api/app'

export const versionQuery = queryOptions({
  queryKey: ['app', 'version'],
  queryFn: () => {
    return getVersion()
  },
})
