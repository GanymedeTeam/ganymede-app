import { isAppOldVersionQuery } from '@/queries/is_old_version.query.ts'
import { Outlet, createFileRoute, redirect } from '@tanstack/react-router'
import { debug, info } from '@tauri-apps/plugin-log'

export const Route = createFileRoute('/_app')({
  beforeLoad: async ({ context: { queryClient } }) => {
    const isOldVersion = await queryClient.ensureQueryData(isAppOldVersionQuery)

    if (isOldVersion !== false && typeof isOldVersion === 'object' && isOldVersion.isOld) {
      await info('App is old version')
      await debug(JSON.stringify(isOldVersion, undefined, 2))

      throw redirect({
        to: '/app-old-version',
        search: {
          fromVersion: isOldVersion.from,
          toVersion: isOldVersion.to,
        },
      })
    }
  },
  component: () => <Outlet />,
})
