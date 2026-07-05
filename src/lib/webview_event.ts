import { Event, listen, UnlistenFn } from '@tauri-apps/api/event'

export type AvailableEvent =
  | 'go-to-next-guide-step'
  | 'go-to-previous-guide-step'
  | 'update-started'
  | 'update-finished'
  | 'update-in-progress'
  | 'update-error'

export type PayloadByEvent = {
  'go-to-next-guide-step': null
  'go-to-previous-guide-step': null
  'update-started': null
  'update-finished': null
  'update-in-progress': [number, number | null]
  'update-error': string
}

export function webviewEvent<Evt extends AvailableEvent>(
  event: Evt,
  cb: (event: Event<PayloadByEvent[Evt]>) => void,
): Promise<UnlistenFn> {
  return listen(event, cb)
}
