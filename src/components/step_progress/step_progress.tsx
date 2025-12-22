import { useLingui } from '@lingui/react/macro'
import { useSuspenseQuery } from '@tanstack/react-query'
import { ChevronLeftIcon, ChevronRightIcon } from 'lucide-react'
import { useState } from 'react'
import { ShortcutTooltip } from '@/components/shortcut_tooltip'
import { Button } from '@/components/ui/button.tsx'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip.tsx'
import { useWebviewEvent } from '@/hooks/use_webview_event'
import { cn } from '@/lib/utils.ts'
import { confQuery } from '@/queries/conf.query'

export function StepProgress({
  currentIndex,
  maxIndex,
  onPrevious,
  onNext,
  onChangeStep,
}: {
  currentIndex: number
  maxIndex: number
  onPrevious: () => Promise<boolean>
  onNext: () => Promise<boolean>
  onChangeStep: (index: number) => Promise<void>
}) {
  const { t } = useLingui()
  const { data: conf } = useSuspenseQuery(confQuery)
  const [scrubbingIndex, setScrubbingIndex] = useState<number | null>(null)
  const total = maxIndex + 1
  const displayIndex = scrubbingIndex !== null ? scrubbingIndex : currentIndex
  const current = displayIndex + 1

  const calculateIndex = (clientX: number, rect: DOMRect) => {
    const percent = (clientX - rect.left) / rect.width
    const index = Math.floor(percent * total - 1)
    return Math.max(0, Math.min(maxIndex, index))
  }

  const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    e.currentTarget.setPointerCapture(e.pointerId)
    const rect = e.currentTarget.getBoundingClientRect()
    setScrubbingIndex(calculateIndex(e.clientX, rect))
  }

  const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (e.currentTarget.hasPointerCapture(e.pointerId)) {
      const rect = e.currentTarget.getBoundingClientRect()
      setScrubbingIndex(calculateIndex(e.clientX, rect))
    }
  }

  const handlePointerUp = async (e: React.PointerEvent<HTMLDivElement>) => {
    e.currentTarget.releasePointerCapture(e.pointerId)

    const indexToSet = scrubbingIndex

    if (indexToSet !== null) {
      if (indexToSet !== currentIndex) {
        await onChangeStep(indexToSet)
      }
      setScrubbingIndex((current) => (current === indexToSet ? null : current))
    }
  }

  useWebviewEvent('go-to-previous-guide-step', () => void onPrevious(), [currentIndex])
  useWebviewEvent('go-to-next-guide-step', () => void onNext(), [currentIndex])

  return (
    <div className="flex min-w-0 flex-1 items-center gap-1">
      <ShortcutTooltip shortcut={conf.shortcuts?.goPreviousStep} description={t`Précédent`}>
        <Button
          size="icon"
          variant="ghost"
          onClick={onPrevious}
          disabled={currentIndex === 0}
          className="size-6 shrink-0 opacity-60 hover:opacity-100"
        >
          <ChevronLeftIcon className="size-3!" />
        </Button>
      </ShortcutTooltip>

      <TooltipProvider>
        <Tooltip open={scrubbingIndex !== null ? true : undefined}>
          <TooltipTrigger asChild>
            <div
              className={cn(
                'relative flex h-5 min-w-0 flex-1 cursor-pointer touch-none items-center justify-center overflow-hidden rounded-[6px] bg-surface-inset',
              )}
              onPointerDown={handlePointerDown}
              onPointerMove={handlePointerMove}
              onPointerUp={handlePointerUp}
            >
              <div
                className={cn(
                  'absolute inset-y-0 left-0 bg-[#6ABC65]/80',
                  // Disable transition during scrubbing for instant feedback
                  scrubbingIndex === null && 'transition-all duration-300',
                )}
                style={{ width: `${(current / total) * 100}%` }}
              />
              <span className="relative z-10 select-none font-medium text-white text-xs drop-shadow">
                {current}/{total}
              </span>
            </div>
          </TooltipTrigger>
          <TooltipContent side="top" className="px-2 py-1 text-xs">
            {t`Étape ${current}`}
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>

      <ShortcutTooltip shortcut={conf.shortcuts?.goNextStep} description={t`Suivant`}>
        <Button
          size="icon"
          variant="ghost"
          onClick={onNext}
          disabled={currentIndex === maxIndex}
          className="size-6 shrink-0 opacity-60 hover:opacity-100"
        >
          <ChevronRightIcon className="size-3!" />
        </Button>
      </ShortcutTooltip>
    </div>
  )
}
