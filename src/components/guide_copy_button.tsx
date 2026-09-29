import { useLingui } from '@lingui/react/macro'
import { writeText } from '@tauri-apps/plugin-clipboard-manager'
import type { MouseEvent, PropsWithChildren } from 'react'
import { toast } from 'sonner'

import { cn } from '@/lib/utils.ts'

export function GuideCopyButton({
  content,
  disabled,
  children,
  className,
  warning,
}: PropsWithChildren<{ content: string; disabled: boolean; className?: string; warning?: string }>) {
  const { t } = useLingui()

  async function copyContentToClipboard(event: MouseEvent<HTMLButtonElement>) {
    event.stopPropagation()

    try {
      await writeText(content)

      toast(
        t`${content} copié`,
        warning ? { description: warning, classNames: { description: 'text-orange-400!' } } : undefined,
      )
    } catch {
      toast.error(t`Impossible de copier dans le presse-papiers`)
    }
  }

  return (
    <button
      className={cn('inline cursor-pointer', className)}
      disabled={disabled}
      onClick={copyContentToClipboard}
      title={t`Copier : ${content}`}
      type="button"
    >
      {children}
    </button>
  )
}
