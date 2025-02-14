import { dynamicActiveLocale } from '@/i18n.ts'
import { cn } from '@/lib/utils.ts'
import { Trans } from '@lingui/react/macro'
import { Label, type LabelProps } from './ui/label.tsx'
import { Select, SelectContent, SelectItem, SelectProps, SelectTrigger, SelectValue } from './ui/select.tsx'

export function SelectLangLabel({ className, ...props }: Omit<LabelProps, 'children'>) {
  return (
    <Label className={cn('text-xs', className)} {...props}>
      <Trans>Langue</Trans>
    </Label>
  )
}

export function SelectLangSelect({
  value,
  onValueChange,
  id,
  className,
  ...props
}: Omit<SelectProps, 'children'> & { id?: string; className?: string }) {
  return (
    <Select
      {...props}
      value={value}
      onValueChange={async (value) => {
        onValueChange?.(value)
        await dynamicActiveLocale(value.toLowerCase())
      }}
    >
      <SelectTrigger id={id} className={cn('text-xs', className)}>
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="Fr">Français</SelectItem>
        <SelectItem value="En">English</SelectItem>
        <SelectItem value="Es">Español</SelectItem>
        <SelectItem value="Pt">Português</SelectItem>
      </SelectContent>
    </Select>
  )
}
