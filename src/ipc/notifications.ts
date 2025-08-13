import { fromPromise } from 'neverthrow'
import { taurpc } from '@/ipc/ipc.ts'

export class GetUnviewedNotificationsError extends Error {
  static from(error: unknown) {
    return new GetUnviewedNotificationsError('Failed to get unviewed notifications', { cause: error })
  }
}

export class MarkNotificationAsViewedError extends Error {
  static from(error: unknown) {
    return new MarkNotificationAsViewedError('Failed to mark notification as viewed', { cause: error })
  }
}

export class GetViewedNotificationsError extends Error {
  static from(error: unknown) {
    return new GetViewedNotificationsError('Failed to get viewed notifications', { cause: error })
  }
}

export function getUnviewedNotifications() {
  return fromPromise(taurpc.notifications.getUnviewedNotifications(), GetUnviewedNotificationsError.from)
}

export function markNotificationAsViewed(notificationId: number) {
  return fromPromise(taurpc.notifications.markNotificationAsViewed(notificationId), MarkNotificationAsViewedError.from)
}

export function getViewedNotifications() {
  return fromPromise(taurpc.notifications.getViewedNotifications(), GetViewedNotificationsError.from)
}
