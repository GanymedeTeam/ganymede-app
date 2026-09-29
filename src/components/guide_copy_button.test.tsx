// @vitest-environment jsdom
import { setupI18n } from '@lingui/core'
import { I18nProvider } from '@lingui/react'
import { writeText } from '@tauri-apps/plugin-clipboard-manager'
import { act } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { toast } from 'sonner'
import { afterEach, beforeEach, expect, test, vi } from 'vitest'

import { GuideCopyButton } from '@/components/guide_copy_button.tsx'

vi.mock('@tauri-apps/plugin-clipboard-manager', () => ({ writeText: vi.fn() }))
vi.mock('sonner', () => ({ toast: Object.assign(vi.fn(), { error: vi.fn() }) }))

const i18n = setupI18n({ locale: 'fr', messages: {} })

let container: HTMLDivElement
let root: Root

beforeEach(() => {
  vi.clearAllMocks()
  vi.mocked(writeText).mockResolvedValue(undefined)

  container = document.createElement('div')
  document.body.append(container)
  root = createRoot(container)
})

afterEach(async () => {
  await act(async () => root.unmount())

  container.remove()
})

async function renderCopyButton(disabled = false, warning?: string) {
  await act(async () =>
    root.render(
      <I18nProvider i18n={i18n}>
        <input type="checkbox" />

        <GuideCopyButton content="/zaap 5,7 ; /travel 11,10" disabled={disabled} warning={warning}>
          <span>Destination</span>
        </GuideCopyButton>
      </I18nProvider>,
    ),
  )

  return container.querySelector('button')!
}

test('copies the preview exactly, acknowledges success, and leaves the checkbox unchanged', async () => {
  const button = await renderCopyButton()

  expect(button.title).toContain('/zaap 5,7 ; /travel 11,10')
  expect(button.type).toBe('button')

  await act(async () => button.click())

  expect(writeText).toHaveBeenCalledWith('/zaap 5,7 ; /travel 11,10')
  expect(toast).toHaveBeenCalledOnce()
  expect(container.querySelector('input')!.checked).toBe(false)
})

test('does not report a successful copy if the clipboard rejects', async () => {
  vi.mocked(writeText).mockRejectedValue(new Error('clipboard unavailable'))

  const button = await renderCopyButton(false, 'Surtaxe possible')

  await act(async () => button.click())

  expect(toast).not.toHaveBeenCalled()
  expect(toast.error).toHaveBeenCalledOnce()
})

test('includes the surcharge warning only after a successful clipboard write', async () => {
  let completeClipboardWrite!: () => void
  vi.mocked(writeText).mockReturnValue(
    new Promise<void>((resolve) => {
      completeClipboardWrite = resolve
    }),
  )

  const button = await renderCopyButton(false, 'Surtaxe possible')

  await act(async () => button.click())

  expect(toast).not.toHaveBeenCalled()

  await act(async () => completeClipboardWrite())

  expect(toast).toHaveBeenCalledExactlyOnceWith('/zaap 5,7 ; /travel 11,10 copié', {
    description: 'Surtaxe possible',
    classNames: { description: 'text-orange-400!' },
  })
})

test('does not copy when disabled', async () => {
  const button = await renderCopyButton(true)

  await act(async () => button.click())

  expect(writeText).not.toHaveBeenCalled()
})
