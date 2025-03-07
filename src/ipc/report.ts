import { ReportPayload } from '@/ipc/bindings.ts'
import { taurpc } from '@/ipc/ipc.ts'
import { fromPromise } from 'neverthrow'

export class ReportError extends Error {
  public status: number
  public responseText: string

  constructor(
    message: string,
    { status, responseText, cause }: { status: number; responseText: string; cause?: unknown },
  ) {
    super(message, { cause })
    this.status = status
    this.responseText = responseText
  }

  static from(error: unknown) {
    console.error(error)

    if (typeof error === 'object' && error !== null && 'Status' in error && Array.isArray(error.Status)) {
      const [status, responseText] = error.Status as [number, string]
      return new ReportError('Failed to add report', { status, responseText, cause: error })
    }

    return new ReportError('Failed to add report', { status: -1, responseText: '', cause: error })
  }
}

export function report(payload: ReportPayload) {
  return fromPromise(taurpc.report.send_report(payload), ReportError.from)
}
