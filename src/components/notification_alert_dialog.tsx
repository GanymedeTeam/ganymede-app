import { Plural, Trans } from '@lingui/react/macro'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { error } from '@tauri-apps/plugin-log'
import { EyeIcon } from 'lucide-react'
import { useCallback, useEffect, useState } from 'react'
import { EditorHtmlParsing } from '@/components/editor_html_parsing.tsx'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert_dialog'
import { ScrollArea } from '@/components/ui/scroll_area.tsx'
import { Notification } from '@/ipc/bindings.ts'
import { useMarkNotificationViewed } from '@/mutations/mark_notification_viewed.mutation.ts'
import { unviewedNotificationsQuery } from '@/queries/notifications.query.ts'

function useInterval(initialValue = 2) {
  const [count, setCount] = useState(initialValue)
  const [isActive, setIsActive] = useState(false)

  const start = useCallback(() => {
    setCount(initialValue)
    setIsActive(true)
  }, [initialValue])

  const stop = useCallback(() => {
    setIsActive(false)
  }, [])

  const reset = useCallback(() => {
    setCount(initialValue)
  }, [initialValue])

  useEffect(() => {
    if (!isActive) return

    const interval = setInterval(() => {
      setCount((prev) => {
        if (prev <= 1) {
          setIsActive(false)
          return 0
        }
        return prev - 1
      })
    }, 1000)

    return () => clearInterval(interval)
  }, [isActive])

  return { count, start, stop, reset, isActive }
}

export function NotificationAlertDialog() {
  const queryClient = useQueryClient()
  const [currentNotification, setCurrentNotification] = useState<Notification | null>(null)
  const [notificationDialogOpen, setNotificationDialogOpen] = useState(false)
  const [processedNotifications, setProcessedNotifications] = useState(0)

  const unviewedNotifications = useQuery(unviewedNotificationsQuery)

  const markAsViewed = useMarkNotificationViewed()
  const { count: counterValue, start: startCounter, reset: resetCounter } = useInterval(2)

  useEffect(() => {
    if (currentNotification) {
      startCounter()
    }
  }, [currentNotification, startCounter])

  useEffect(() => {
    if (unviewedNotifications.isSuccess && unviewedNotifications.data.length > 0) {
      // Find the first notification that hasn't been processed yet
      const newNotification = unviewedNotifications.data.at(0)

      if (newNotification) {
        setCurrentNotification(newNotification)
        setNotificationDialogOpen(true)
      }
    }
  }, [unviewedNotifications.isSuccess, unviewedNotifications.data?.length, unviewedNotifications.data?.at])

  const handleMarkAsRead = async (evt: React.MouseEvent<HTMLButtonElement>) => {
    evt.stopPropagation()
    evt.preventDefault()

    if (currentNotification) {
      try {
        const hasNextNotification = (unviewedNotifications.data?.length ?? 0) > processedNotifications + 1

        await markAsViewed.mutateAsync(currentNotification.id)

        if (hasNextNotification) {
          setCurrentNotification(unviewedNotifications.data?.at(processedNotifications + 1) ?? null)
          setProcessedNotifications((prev) => prev + 1)
          resetCounter()
        } else {
          setNotificationDialogOpen(false)

          setTimeout(() => {
            setProcessedNotifications(0)
            setCurrentNotification(null)
          }, 500)
        }
      } catch (err) {
        error(`Failed to mark notification as viewed: ${err instanceof Error ? err.message : 'Unknown error'}`)

        await queryClient.invalidateQueries(unviewedNotificationsQuery)

        setTimeout(() => {
          setProcessedNotifications(0)
          setCurrentNotification(null)
        }, 500)
      }
    }
  }

  if (!currentNotification || !unviewedNotifications.isSuccess) {
    return null
  }

  const isDisabled = counterValue !== 0 || markAsViewed.isPending

  return (
    <AlertDialog open={notificationDialogOpen} onOpenChange={setNotificationDialogOpen}>
      <AlertDialogContent className="h-full max-h-[90vh]">
        <AlertDialogHeader aria-describedby={undefined}>
          <AlertDialogTitle>
            <Plural
              value={unviewedNotifications.data.length}
              one="Message de l'équipe"
              other={`Messages de l'équipe ${processedNotifications + 1}/${unviewedNotifications.data.length}`}
            />
          </AlertDialogTitle>
        </AlertDialogHeader>
        <ScrollArea className="h-full" type="auto">
          <EditorHtmlParsing html={currentNotification.text} disabled={isDisabled} />
        </ScrollArea>
        <AlertDialogFooter>
          <AlertDialogAction onClick={handleMarkAsRead} disabled={isDisabled} className="[&_svg]:size-4">
            {markAsViewed.isPending ? (
              <Trans>En cours...</Trans>
            ) : (
              <>
                <Trans>Marquer comme lu</Trans>
                {counterValue !== 0 ? (
                  <span className="flex size-4 items-center justify-center rounded-full bg-red-500 font-bold text-white text-xs">
                    {counterValue}
                  </span>
                ) : (
                  <EyeIcon />
                )}
              </>
            )}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
