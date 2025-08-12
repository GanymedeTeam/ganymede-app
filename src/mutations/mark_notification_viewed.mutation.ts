import { useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { markNotificationAsViewed } from '@/ipc/notifications.ts'
import { unviewedNotificationsQuery } from '@/queries/notifications.query.ts'

export function useMarkNotificationViewed() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (notificationId: number) => {
      const result = await markNotificationAsViewed(notificationId)
      if (result.isErr()) {
        throw result.error
      }
      return result.value
    },
    onSuccess: () => {
      queryClient.invalidateQueries(unviewedNotificationsQuery)
    },
    onError: (error) => {
      console.error('Failed to mark notification as viewed:', error)
      toast.error('Failed to mark notification as viewed')
    },
  })
}
