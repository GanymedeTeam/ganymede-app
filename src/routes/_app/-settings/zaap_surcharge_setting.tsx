import { Trans } from '@lingui/react/macro'
import { useSuspenseQuery } from '@tanstack/react-query'

import { Label } from '@/components/ui/label.tsx'
import { Switch } from '@/components/ui/switch.tsx'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip.tsx'
import { DEFAULT_ZAAP_COPY_MODE } from '@/lib/guide_travel_action.ts'
import { useSetConf } from '@/mutations/set_conf.mutation.ts'
import { confQuery } from '@/queries/conf.query.ts'

export function ZaapSurchargeSetting() {
  const conf = useSuspenseQuery(confQuery)
  const setConf = useSetConf()

  const zaapCommandEnabled = (conf.data.zaapCopyMode ?? DEFAULT_ZAAP_COPY_MODE) === 'Command'

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <div
            className="flex items-center justify-between gap-2"
            tabIndex={!zaapCommandEnabled ? 0 : undefined}
            role="group"
            aria-labelledby="zaap-surcharge-label"
          >
            <Label className="text-xs" htmlFor="zaap-surcharge" id="zaap-surcharge-label">
              <Trans>Autoriser la surtaxe des zaaps</Trans>
            </Label>

            <Switch
              id="zaap-surcharge"
              checked={zaapCommandEnabled && (conf.data.allowZaapSurcharge ?? false)}
              disabled={!zaapCommandEnabled}
              className={!zaapCommandEnabled ? 'pointer-events-none' : undefined}
              onCheckedChange={(checked) => setConf.mutate({ ...conf.data, allowZaapSurcharge: checked })}
            />
          </div>
        </TooltipTrigger>

        {!zaapCommandEnabled && (
          <TooltipContent className="max-w-60 text-balance">
            <Trans>Sélectionnez « Commande » pour autoriser la surtaxe des zaaps.</Trans>
          </TooltipContent>
        )}
      </Tooltip>
    </TooltipProvider>
  )
}
