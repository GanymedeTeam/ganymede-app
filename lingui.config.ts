import { LinguiConfig } from '@lingui/conf'
import { formatter } from '@lingui/format-po'

export default {
  locales: ['en', 'es', 'fr', 'pt'],
  sourceLocale: 'fr',
  catalogs: [
    {
      path: '<rootDir>/src/locales/{locale}/messages',
      include: ['src'],
    },
  ],
  format: formatter(),
} satisfies LinguiConfig
