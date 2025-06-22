import { Event } from '@tauri-apps/api/event'
import { useEffect } from 'react'
import { AvailableEvent, PayloadByEvent, webviewEvent } from '@/lib/webview_event.ts'

export function useWebviewEvent<Evt extends AvailableEvent>(
  eventName: Evt,
  cb: (event: Event<PayloadByEvent[Evt]>) => void | Promise<void>,
  deps: unknown[] = [],
) {
  // biome-ignore lint/correctness/useExhaustiveDependencies: we use the parameter deps
  useEffect(() => {
    const unlisten = webviewEvent(eventName, async (event) => {
      await cb(event)
    })

    return () => {
      unlisten.then((fn) => fn())
    }
  }, [...deps])
}
