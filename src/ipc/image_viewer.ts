import { fromPromise } from 'neverthrow'
import { taurpc } from '@/ipc/ipc.ts'

export class OpenImageViewerError extends Error {
  static from(error: unknown) {
    return new OpenImageViewerError('Failed to open image viewer', { cause: error })
  }
}

export function openImageViewer(imageUrl: string, title?: string) {
  return fromPromise(taurpc.image_viewer.openImageViewer(imageUrl, title ?? null), OpenImageViewerError.from)
}

export class CloseImageViewerError extends Error {
  static from(error: unknown) {
    return new CloseImageViewerError('Failed to close image viewer', { cause: error })
  }
}

export function closeImageViewer(windowLabel: string) {
  return fromPromise(taurpc.image_viewer.closeImageViewer(windowLabel), CloseImageViewerError.from)
}
