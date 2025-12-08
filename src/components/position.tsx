import { useLingui } from '@lingui/react/macro'
import { useSuspenseQuery } from '@tanstack/react-query'
import { Check } from 'lucide-react'
import { useState } from 'react'
import { copyPosition } from '@/lib/copy_position.ts'
import { confQuery } from '@/queries/conf.query.ts'

export function Position({ pos_x, pos_y }: { pos_x: number; pos_y: number }) {
  const { t } = useLingui()
  const conf = useSuspenseQuery(confQuery)
  const [copied, setCopied] = useState(false)

  const onClick = async () => {
    await copyPosition(pos_x, pos_y, conf.data.autoTravelCopy)
    setCopied(true)
    setTimeout(() => setCopied(false), 1500)
  }

  return (
    <button
      className="relative cursor-pointer text-start text-sm text-yellow-400"
      onClick={onClick}
      title={conf.data.autoTravelCopy ? t`Copier la commande autopilote` : t`Copier la position`}
    >
      [{pos_x},{pos_y}]
      {copied && (
        <span className="absolute -right-5 top-1/2 -translate-y-1/2 animate-in fade-in zoom-in duration-200">
          <Check className="h-3.5 w-3.5 text-green-400" />
        </span>
      )}
    </button>
  )
}
