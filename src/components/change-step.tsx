import { Button } from '@/components/ui/button.tsx'
import { useWebviewEvent } from '@/hooks/use_webview_event.ts'
import { ChevronLeftIcon, ChevronRightIcon } from 'lucide-react'
import { useState } from 'react'
import { InvisibleInput } from './invisible-input.tsx'

export function ChangeStep({
  currentIndex,
  maxIndex,
  onPrevious,
  onNext,
  setCurrentIndex,
}: {
  currentIndex: number
  maxIndex: number
  onPrevious: () => Promise<boolean>
  onNext: () => Promise<boolean>
  setCurrentIndex: (index: number) => Promise<void>
}) {
  const current = currentIndex + 1
  const [innerValue, setInnerValue] = useState(current.toString())

  const onInnerNext = async () => {
    const canMove = await onNext()
    if (!canMove) {
      return
    }
    setInnerValue((current + 1).toString())
  }

  const onInnerPrevious = async () => {
    const canMove = await onPrevious()
    if (!canMove) {
      return
    }
    setInnerValue((current - 1).toString())
  }

  useWebviewEvent(
    'go-to-previous-guide-step',
    async () => {
      await onInnerPrevious()
    },
    [current],
  )

  useWebviewEvent(
    'go-to-next-guide-step',
    async () => {
      await onInnerNext()
    },
    [current],
  )

  return (
    <div className="center-absolute flex items-center gap-0.5">
      <Button size="icon-sm" variant="secondary" onClick={onInnerPrevious}>
        <ChevronLeftIcon />
      </Button>
      <div className="flex flex-col items-center rounded px-0.5 font-semibold text-primary-foreground text-sm leading-4">
        <InvisibleInput
          value={innerValue}
          max={maxIndex}
          min={1}
          gap={1}
          onChange={setInnerValue}
          onSubmit={async (value) => {
            const numberIndex = parseInt(value)
            await setCurrentIndex(numberIndex)
            setInnerValue((numberIndex + 1).toString())
          }}
        />
        <span className="text-xs">{maxIndex + 1}</span>
      </div>
      <Button size="icon-sm" variant="secondary" onClick={onInnerNext}>
        <ChevronRightIcon />
      </Button>
    </div>
  )
}
