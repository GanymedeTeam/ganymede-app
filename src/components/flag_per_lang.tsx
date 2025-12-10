import * as Flag from 'country-flag-icons/react/3x2'
import { cn } from '@/lib/utils'

export function FlagPerLang({ lang, className }: { lang: string, className?: string }) {
  switch (lang) {
    case 'fr':
      return <Flag.FR className={cn("size-4 xs:size-5", className)} />
    case 'en':
      return <Flag.US className={cn("size-4 xs:size-5", className)} />
    case 'de':
      return <Flag.DE className={cn("size-4 xs:size-5", className)} />
    case 'es':
      return <Flag.ES className={cn("size-4 xs:size-5", className)} />
    case 'it':
      return <Flag.IT className={cn("size-4 xs:size-5", className)} />
    case 'pt':
      return <Flag.PT className={cn("size-4 xs:size-5", className)} />
    default:
      return <Flag.FR />
  }
}
