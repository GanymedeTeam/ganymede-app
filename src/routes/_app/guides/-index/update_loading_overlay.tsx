import { Trans } from '@lingui/react/macro'

interface UpdateLoadingOverlayProps {
  isVisible: boolean
  seconds: number
}

export function UpdateLoadingOverlay({ isVisible, seconds }: UpdateLoadingOverlayProps) {
  if (!isVisible) return null

  return (
    <div className="fixed inset-0 top-15 z-10 flex flex-col items-center justify-center bg-accent/75">
      <div className="flex items-center">
        <div className="flex items-center gap-2 p-2">
          <span>
            <Trans>Mise à jour de vos guides...</Trans>
          </span>
        </div>
      </div>
      <span className="text-3xl">{seconds.toFixed(1)}s</span>
    </div>
  )
}
