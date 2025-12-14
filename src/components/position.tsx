import { useLingui } from '@lingui/react/macro'
import { useSuspenseQuery } from '@tanstack/react-query'
import { toast } from 'sonner'
import { copyPosition } from '@/lib/copy_position.ts'
import { confQuery } from '@/queries/conf.query.ts'

export function Position({ pos_x, pos_y }: { pos_x: number; pos_y: number }) {
  const { t } = useLingui()
  const conf = useSuspenseQuery(confQuery)

  const onClick = async () => {
    await copyPosition(pos_x, pos_y, conf.data.autoTravelCopy)
    const content = conf.data.autoTravelCopy
      ? `/travel ${pos_x},${pos_y}`
      : `[${pos_x},${pos_y}]`
    toast(t`${content} copié`)
  }

  return (
    <button
      className="cursor-pointer text-start text-sm text-yellow-400"
      onClick={onClick}
      title={conf.data.autoTravelCopy ? t`Copier la commande autopilote` : t`Copier la position`}
    >
      [{pos_x},{pos_y}]
    </button>
  )
}

