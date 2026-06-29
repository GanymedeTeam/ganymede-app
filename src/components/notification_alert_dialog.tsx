import { Plural, Trans } from '@lingui/react/macro'
import { useQuery } from '@tanstack/react-query'
import { useLocation } from '@tanstack/react-router'
import { error } from '@tauri-apps/plugin-log'
import 'dayjs/locale/fr'
import 'dayjs/locale/en'
import 'dayjs/locale/es'
import 'dayjs/locale/pt'
import dayjs from 'dayjs'
import { EyeIcon } from 'lucide-react'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'

import { EditorHtmlParsing } from '@/components/editor_html_parsing.tsx'
import { ErrorBoundary } from '@/components/error_boundary.tsx'
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
import { isInImageViewerPath } from '@/lib/image_viewer.ts'
import { useMarkNotificationViewed } from '@/mutations/mark_notification_viewed.mutation.ts'
import { confQuery } from '@/queries/conf.query.ts'
import { unviewedNotificationsQuery } from '@/queries/notifications.query.ts'

function useCountdown(seconds = 2) {
  const [remaining, setRemaining] = useState(0)
  const deadlineRef = useRef(0)

  const start = useCallback(() => {
    deadlineRef.current = Date.now() + seconds * 1000
    setRemaining(seconds)
  }, [seconds])

  useEffect(() => {
    if (remaining <= 0) return

    const interval = setInterval(() => {
      const next = Math.max(0, Math.ceil((deadlineRef.current - Date.now()) / 1000))
      setRemaining(next)
      if (next <= 0) clearInterval(interval)
    }, 200)

    return () => clearInterval(interval)
  }, [remaining])

  return { remaining, start }
}

export function NotificationAlertDialog() {
  const [currentIndex, setCurrentIndex] = useState(0)
  const [isOpen, setIsOpen] = useState(false)
  const [batch, setBatch] = useState<Notification[]>([])
  const location = useLocation()

  const unviewedNotifications = useQuery({
    ...unviewedNotificationsQuery,
    enabled: !isInImageViewerPath(location.pathname),
  })
  const conf = useQuery({
    ...confQuery,
    enabled: !isInImageViewerPath(location.pathname),
  })
  const markAsViewed = useMarkNotificationViewed()
  const { remaining, start } = useCountdown(2)

  const notifications = useMemo(() => unviewedNotifications.data ?? [], [unviewedNotifications.data])
  const totalNotifications = batch.length
  const currentNotification = batch[currentIndex]

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

  const close = useCallback(() => {
    setIsOpen(false)
    setCurrentIndex(0)
    setBatch([])
  }, [])

  useEffect(() => {
    if (notifications.length > 0 && !isOpen) {
      setCurrentIndex(0)
      setBatch(notifications.slice().reverse())
      setIsOpen(true)
    } else if (notifications.length === 0 && isOpen) {
      close()
    }
  }, [notifications, isOpen, close])

  useEffect(() => {
    if (currentNotification && isOpen) {
      start()
    }
  }, [currentNotification, isOpen, start])

  const handleMarkAsRead = async () => {
    if (!currentNotification) return

    try {
      await markAsViewed.mutateAsync(currentNotification.id)

      const newIndex = currentIndex + 1

      if (newIndex >= totalNotifications) {
        close()
      } else {
        setCurrentIndex(newIndex)
      }
    } catch (err) {
      error(`Failed to mark notification as viewed: ${err instanceof Error ? err.message : 'Unknown error'}`)
      close()
    }
  }

  if (!isOpen || !currentNotification || !conf.data) {
    return null
  }

  const isDisabled = remaining > 0 || markAsViewed.isPending
  const locale = getLocale(getLang(conf.data.lang))

  return (
    <AlertDialog open={isOpen}>
      <AlertDialogContent
        className="flex h-full max-h-[calc(100vh-var(--spacing-titlebar)*2)] flex-col overflow-hidden"
        onEscapeKeyDown={(evt) => evt.preventDefault()}
      >
        <AlertDialogHeader aria-describedby={undefined} className="shrink-0">
          <AlertDialogTitle>
            <Plural
              one="Message de l'équipe"
              other={`Messages de l'équipe ${currentIndex + 1}/${totalNotifications}`}
              value={totalNotifications}
            />
          </AlertDialogTitle>
          <p className="text-sm text-muted-foreground">
            {dayjs(currentNotification.displayAt).locale(locale).format('DD MMMM YYYY à HH:mm')}
          </p>
        </AlertDialogHeader>
        <ScrollArea className="min-h-0 flex-1" type="auto">
          <ErrorBoundary
            fallback={
              <p className="text-sm text-muted-foreground">
                <Trans>Ce message n'a pas pu être affiché. Vous pouvez le marquer comme lu.</Trans>
              </p>
            }
            onError={(err) => error(`Failed to render notification ${currentNotification.id}: ${err.message}`)}
          >
            <EditorHtmlParsing disabled={isDisabled} html={currentNotification.text} />
          </ErrorBoundary>
        </ScrollArea>
        <AlertDialogFooter className="shrink-0">
          <AlertDialogAction className="[&_svg]:size-4" disabled={isDisabled} onClick={handleMarkAsRead}>
            {markAsViewed.isPending ? (
              <Trans>En cours...</Trans>
            ) : (
              <>
                <Trans>Marquer comme lu</Trans>
                {remaining > 0 ? (
                  <span className="flex size-4 items-center justify-center rounded-full bg-red-500 text-xs font-bold text-white">
                    {remaining}
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
