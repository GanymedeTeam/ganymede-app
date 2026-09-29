import { Trans, useLingui } from '@lingui/react/macro'
import { useSuspenseQuery } from '@tanstack/react-query'

import { Label } from '@/components/ui/label.tsx'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select.tsx'
import { DEFAULT_ZAAP_COPY_MODE } from '@/lib/guide_travel_action.ts'
import { useSetConf } from '@/mutations/set_conf.mutation.ts'
import { confQuery } from '@/queries/conf.query.ts'

export function ZaapCopySetting() {
  const conf = useSuspenseQuery(confQuery)
  const setConf = useSetConf()

  const { t } = useLingui()
  const zaapCopyOptions = [
    { value: 'Name', label: t`Nom` },
    { value: 'Position', label: t`Position` },
    { value: 'Command', label: t`Commande` },
  ]

  return (
    <>
      <Label className="text-xs" htmlFor="zaap-copy-mode">
        <Trans>Copie du zaap</Trans>
      </Label>

      <Select
        value={conf.data.zaapCopyMode ?? DEFAULT_ZAAP_COPY_MODE}
        onValueChange={(value) => {
          if (value === 'Name' || value === 'Position' || value === 'Command') {
            setConf.mutate({ ...conf.data, zaapCopyMode: value })
          }
        }}
      >
        <SelectTrigger className="text-xs" id="zaap-copy-mode">
          <SelectValue />
        </SelectTrigger>

        <SelectContent>
          {zaapCopyOptions.map(({ value, label }) => (
            <SelectItem key={value} value={value}>
              {label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </>
  )
}
