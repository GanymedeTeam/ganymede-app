import * as Flag from 'country-flag-icons/react/3x2'

export function FlagPerLang({ lang }: { lang: string }) {
  switch (lang) {
    case 'fr':
      return <Flag.FR className="size-4 xs:size-5" />
    case 'en':
      return <Flag.US className="size-4 xs:size-5" />
    case 'de':
      return <Flag.DE className="size-4 xs:size-5" />
    case 'es':
      return <Flag.ES className="size-4 xs:size-5" />
    case 'it':
      return <Flag.IT className="size-4 xs:size-5" />
    case 'pt':
      return <Flag.PT className="size-4 xs:size-5" />
    default:
      return <Flag.FR />
  }
}
