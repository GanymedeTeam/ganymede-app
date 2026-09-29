import { Trans, useLingui } from '@lingui/react/macro'
import { useSuspenseQuery } from '@tanstack/react-query'

import { Label } from '@/components/ui/label.tsx'
import { Switch } from '@/components/ui/switch.tsx'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip.tsx'
import { DEFAULT_ZAAP_COPY_MODE, DEFAULT_USE_CHAINED_COMMANDS } from '@/lib/guide_travel_action.ts'
import { useSetConf } from '@/mutations/set_conf.mutation.ts'
import { confQuery } from '@/queries/conf.query.ts'

export function ChainedCommandsSetting() {
  const conf = useSuspenseQuery(confQuery)
  const setConf = useSetConf()

  const { t } = useLingui()
  const zaapCommandEnabled = (conf.data.zaapCopyMode ?? DEFAULT_ZAAP_COPY_MODE) === 'Command'
  const chainedCommandsDisabled = !conf.data.autoTravelCopy || !zaapCommandEnabled
  const chainedCommandsDisabledReason =
    !conf.data.autoTravelCopy && !zaapCommandEnabled
      ? t`Activez la copie d'autopilote et choisissez Commande pour la copie du zaap.`
      : !zaapCommandEnabled
        ? t`Choisissez Commande pour la copie du zaap afin d'utiliser les commandes chaînées.`
        : t`Activez la copie d'autopilote pour utiliser les commandes chaînées.`

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <div
            className="flex items-center justify-between gap-2"
            tabIndex={chainedCommandsDisabled ? 0 : undefined}
            role="group"
            aria-labelledby="chained-commands-label"
          >
            <Label className="text-xs" htmlFor="chained-commands" id="chained-commands-label">
              <Trans>Utiliser les commandes chaînées</Trans>
            </Label>

            <Switch
              id="chained-commands"
              checked={!chainedCommandsDisabled && (conf.data.useChainedCommands ?? DEFAULT_USE_CHAINED_COMMANDS)}
              disabled={chainedCommandsDisabled}
              className={chainedCommandsDisabled ? 'pointer-events-none' : undefined}
              onCheckedChange={(checked) => setConf.mutate({ ...conf.data, useChainedCommands: checked })}
            />
          </div>
        </TooltipTrigger>

        {chainedCommandsDisabled && (
          <TooltipContent className="max-w-60 text-balance">{chainedCommandsDisabledReason}</TooltipContent>
        )}
      </Tooltip>
    </TooltipProvider>
  )
}
