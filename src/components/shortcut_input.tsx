import { useLingui } from '@lingui/react/macro'
import { InfoIcon } from 'lucide-react'
import { type KeyboardEvent, useState } from 'react'
import { Input } from '@/components/ui/input.tsx'
import { Label } from '@/components/ui/label.tsx'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip.tsx'

interface ShortcutInputProps {
  id: string
  label: string
  value: string | undefined
  onChange: (value: string) => void
  description?: string
}

function parseKeyEvent(evt: KeyboardEvent<HTMLInputElement>): { shortcut: string; isComplete: boolean } {
  const parts: string[] = []

  if (evt.ctrlKey || evt.metaKey) {
    parts.push('CommandOrControl')
  }
  if (evt.altKey) {
    parts.push('Alt')
  }
  if (evt.shiftKey) {
    parts.push('Shift')
  }

  const key = evt.key
  let hasActualKey = false

  if (key !== 'Control' && key !== 'Alt' && key !== 'Shift' && key !== 'Meta' && key !== 'AltGraph') {
    hasActualKey = true
    if (key.length === 1) {
      parts.push(key.toUpperCase())
    } else if (key === ' ') {
      parts.push('Space')
    } else {
      parts.push(key)
    }
  }

  const hasModifiers = parts.length > 1 && hasActualKey

  return {
    shortcut: parts.join('+'),
    isComplete: hasActualKey && (hasModifiers || parts.length === 1),
  }
}

export function ShortcutInput({ id, label, value, onChange, description }: ShortcutInputProps) {
  const { t } = useLingui()
  const [recording, setRecording] = useState(false)

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center gap-2">
        <Label className="text-xs" htmlFor={id}>
          {label}
        </Label>
        {description && (
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <InfoIcon className="h-3.5 w-3.5 text-muted-foreground" />
              </TooltipTrigger>
              <TooltipContent>
                <p className="text-xs">{description}</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        )}
      </div>
      <Input
        className={recording ? 'cursor-text ring-2 ring-primary' : 'cursor-pointer'}
        id={id}
        onBlur={() => setRecording(false)}
        onClick={(evt) => {
          evt.currentTarget.focus()
        }}
        onFocus={() => setRecording(true)}
        onKeyDown={(evt) => {
          evt.preventDefault()

          if (evt.key === 'Escape') {
            ;(evt.target as HTMLInputElement).blur()
            return
          }

          const { shortcut, isComplete } = parseKeyEvent(evt)
          if (isComplete) {
            onChange(shortcut)
            ;(evt.target as HTMLInputElement).blur()
          }
        }}
        placeholder={recording ? t`Appuyez sur les touches...` : t`Cliquez pour enregistrer`}
        readOnly
        value={recording ? '' : value || ''}
      />
    </div>
  )
}
