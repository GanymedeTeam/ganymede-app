import { Plural, Trans } from '@lingui/react/macro'
import { useQuery, useSuspenseQuery } from '@tanstack/react-query'
import { error } from '@tauri-apps/plugin-log'
import dayjs from 'dayjs'
import 'dayjs/locale/fr'
import 'dayjs/locale/en'
import 'dayjs/locale/es'
import 'dayjs/locale/pt'
import { EyeIcon } from 'lucide-react'
import { useCallback, useEffect, useState } from 'react'
import { EditorHtmlParsing } from '@/components/editor_html_parsing.tsx'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogContent,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert_dialog'
import { ScrollArea } from '@/components/ui/scroll_area.tsx'
import type { Notification } from '@/ipc/bindings.ts'
import { getLang } from '@/lib/conf.ts'
import { useMarkNotificationViewed } from '@/mutations/mark_notification_viewed.mutation.ts'
import { confQuery } from '@/queries/conf.query.ts'
import { unviewedNotificationsQuery } from '@/queries/notifications.query.ts'

function useTimer(seconds = 2) {
  const [count, setCount] = useState(0)
  const [isActive, setIsActive] = useState(false)

  const start = useCallback(() => {
    setCount(seconds)
    setIsActive(true)
  }, [seconds])

  useEffect(() => {
    if (!isActive || count <= 0) return

    const timer = setTimeout(() => {
      setCount((prev) => prev - 1)
    }, 1000)

    return () => clearTimeout(timer)
  }, [isActive, count])

  useEffect(() => {
    if (count <= 0) {
      setIsActive(false)
    }
  }, [count])

  return { count, start }
}

export function NotificationAlertDialog() {
  const [currentIndex, setCurrentIndex] = useState(0)
  const [isOpen, setIsOpen] = useState(false)
  const [totalNotifications, setTotalNotifications] = useState(0)
  const [allNotifications, setAllNotifications] = useState<Notification[]>([])

  const unviewedNotifications = useQuery(unviewedNotificationsQuery)
  const conf = useSuspenseQuery(confQuery)
  const markAsViewed = useMarkNotificationViewed()
  const { count, start } = useTimer(2)

  const notifications = unviewedNotifications.data ?? []
  const currentNotification = allNotifications[currentIndex]

  const getLocale = (lang: ReturnType<typeof getLang>) => {
    switch (lang) {
      case 'Fr':
        return 'fr'
      case 'En':
        return 'en'
      case 'Es':
        return 'es'
      case 'Pt':
        return 'pt'
      default:
        return 'fr'
    }
  }

  useEffect(() => {
    if (notifications.length > 0 && !isOpen) {
      setCurrentIndex(0)
      setTotalNotifications(notifications.length)
      setAllNotifications(notifications.toReversed())
      setIsOpen(true)
      start()
    } else if (notifications.length === 0 && isOpen) {
      setIsOpen(false)
      setCurrentIndex(0)
      setTotalNotifications(0)
      setAllNotifications([])
    }
  }, [notifications, isOpen, start])

  useEffect(() => {
    if (currentNotification && isOpen) {
      start()
    }
  }, [isOpen, start, currentNotification])

  const handleMarkAsRead = async (evt: React.MouseEvent<HTMLButtonElement>) => {
    evt.stopPropagation()
    evt.preventDefault()

    if (!currentNotification) return

    try {
      await markAsViewed.mutateAsync(currentNotification.id)

      const newIndex = currentIndex + 1
      setCurrentIndex(newIndex)

      if (newIndex >= totalNotifications) {
        setTimeout(() => {
          setIsOpen(false)
          setCurrentIndex(0)
          setTotalNotifications(0)
          setAllNotifications([])
        }, 500)
      }
    } catch (err) {
      error(`Failed to mark notification as viewed: ${err instanceof Error ? err.message : 'Unknown error'}`)
      setIsOpen(false)
      setCurrentIndex(0)
      setTotalNotifications(0)
      setAllNotifications([])
    }
  }

  if (!isOpen || !currentNotification) {
    return null
  }

  const isDisabled = count > 0 || markAsViewed.isPending
  const locale = getLocale(getLang(conf.data.lang))

  return (
    <AlertDialog open={isOpen} onOpenChange={setIsOpen}>
      <AlertDialogContent className="h-full max-h-[90vh]">
        <AlertDialogHeader aria-describedby={undefined}>
          <AlertDialogTitle>
            <Plural
              value={totalNotifications}
              one="Message de l'équipe"
              other={`Messages de l'équipe ${currentIndex + 1}/${totalNotifications}`}
            />
          </AlertDialogTitle>
          <p className="text-muted-foreground text-sm">
            {dayjs(currentNotification.displayAt).locale(locale).format('DD MMMM YYYY à HH:mm')}
          </p>
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
                {count > 0 ? (
                  <span className="flex size-4 items-center justify-center rounded-full bg-red-500 font-bold text-white text-xs">
                    {count}
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
