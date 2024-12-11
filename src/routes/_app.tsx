import { isAppOldVersionQuery } from '@/queries/is_old_version.query'
import { Outlet, createFileRoute, redirect } from '@tanstack/react-router'
import { info } from '@tauri-apps/plugin-log'

export const Route = createFileRoute('/_app')({
  beforeLoad: async ({ context: { queryClient } }) => {
    const isOldVersion = await queryClient.ensureQueryData(isAppOldVersionQuery)

    console.log(isOldVersion)

    if (isOldVersion !== false && typeof isOldVersion === 'object' && isOldVersion.isOld) {
      await info('App is old version')
      await info(JSON.stringify(isOldVersion, undefined, 2))

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
