import { queryOptions } from '@tanstack/react-query'
import { Notification } from '@/ipc/bindings.ts'
import { GetUnviewedNotificationsError, getUnviewedNotifications } from '@/ipc/notifications.ts'

export const unviewedNotificationsQuery = queryOptions<Notification[], GetUnviewedNotificationsError>({
  queryKey: ['notifications', 'unviewed'],
  queryFn: async () => {
    const result = await getUnviewedNotifications()
    if (result.isErr()) {
      throw result.error
    }
    return result.value
  },
  staleTime: 5 * 60 * 1000, // 5 minutes
  refetchOnWindowFocus: false,
})
