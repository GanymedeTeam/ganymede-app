import { Trans } from '@lingui/react/macro'
import { CheckIcon, ChevronDownIcon } from 'lucide-react'
import { useState } from 'react'
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible'
import { useTheme } from '@/hooks/use_theme'
import { type ConfTheme } from '@/ipc/bindings'
import { cn } from '@/lib/utils'

interface ThemePreviewProps {
  theme: { id: ConfTheme; name: string; accent: string; surface: string }
  isSelected: boolean
  onSelect: () => void
}

function ThemePreview({ theme, isSelected, onSelect }: ThemePreviewProps) {
  return (
    <button
      className={cn(
        'relative flex w-full flex-col gap-1 rounded-lg border-2 p-1.5 transition-all',
        isSelected ? 'border-success ring-2 ring-success/30' : 'border-transparent hover:border-border-muted',
      )}
      onClick={onSelect}
      style={{ backgroundColor: theme.surface }}
      type="button"
    >
      <div className="flex w-full flex-col gap-0.5">
        <div
          className="h-1.5 w-full rounded-sm"
          style={{ backgroundColor: `color-mix(in srgb, ${theme.surface} 70%, white)` }}
        />
        <div className="flex gap-0.5">
          <div
            className="flex h-4 flex-1 items-center justify-center rounded-sm"
            style={{ backgroundColor: `color-mix(in srgb, ${theme.surface} 70%, white)` }}
          >
            <div className="h-0.5 w-3 rounded-full" style={{ backgroundColor: theme.accent }} />
          </div>
          <div
            className="h-4 flex-1 rounded-sm"
            style={{ backgroundColor: `color-mix(in srgb, ${theme.surface} 70%, white)` }}
          />
        </div>
      </div>
      <span className="w-full truncate text-center font-medium text-xxs">{theme.name}</span>
      {isSelected && (
        <div className="-top-1 -right-1 absolute flex size-4 items-center justify-center rounded-full bg-success">
          <CheckIcon className="size-2.5 text-surface-page" />
        </div>
      )}
    </button>
  )
}

export function ThemeSelector() {
  const { theme, setTheme, themes } = useTheme()
  const [isOpen, setIsOpen] = useState(false)
  const current = themes.find((t) => t.id === theme) ?? themes[0]

  return (
    <div className="flex flex-col gap-2">
      <Collapsible onOpenChange={setIsOpen} open={isOpen}>
        <CollapsibleTrigger className="group flex w-full cursor-pointer items-center justify-between">
          <p className="font-medium text-xs leading-none">
            <Trans>Thème</Trans>
          </p>
          <div className="flex items-center gap-2">
            <span className="text-muted-foreground text-xs">{current.name}</span>
            <div
              className="size-4 rounded-full border border-border-muted"
              style={{ backgroundColor: current.accent }}
            />
            <ChevronDownIcon
              className={cn('size-4 text-muted-foreground transition-transform', isOpen && 'rotate-180')}
            />
          </div>
        </CollapsibleTrigger>
        <CollapsibleContent className="pt-3">
          <div className="grid grid-cols-4 gap-1.5">
            {themes.map((t) => (
              <ThemePreview isSelected={theme === t.id} key={t.id} onSelect={() => setTheme(t.id)} theme={t} />
            ))}
          </div>
        </CollapsibleContent>
      </Collapsible>
    </div>
  )
}
