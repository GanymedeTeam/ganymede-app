import { Button } from '@/components/ui/button.tsx'
import { useWebviewEvent } from '@/hooks/use_webview_event'
import { ChevronLeftIcon, ChevronRightIcon } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'

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
  const [hadLostFocus, setHadLostFocus] = useState(true)
  const formRef = useRef<HTMLFormElement>(null)

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

  // biome-ignore lint/correctness/useExhaustiveDependencies: no need for innerValue
  useEffect(() => {
    if (innerValue !== current.toString()) {
      setInnerValue(current.toString())
    }
  }, [current])

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

  const handleChange = async () => {
    if (!formRef.current) {
      return
    }

    const data = new FormData(formRef.current)
    const value = data.get('current') as string

    if (value === '') {
      return
    }

    const number = parseInt(value)

    if (Number.isNaN(number) || number < 1) {
      return
    }

    const numberIndex = number - 1
    const nextStepIndex = numberIndex > maxIndex ? maxIndex : numberIndex

    await setCurrentIndex(nextStepIndex)

    setInnerValue((nextStepIndex + 1).toString())
  }

  return (
    <div className="center-absolute flex items-center gap-0.5">
      <Button size="icon-sm" variant="secondary" onClick={onInnerPrevious}>
        <ChevronLeftIcon />
      </Button>
      <div className="flex flex-col items-center rounded px-0.5 font-semibold text-primary-foreground text-sm leading-4">
        <form
          ref={formRef}
          onSubmit={async (evt) => {
            evt.preventDefault()

            await handleChange()
          }}
        >
          <input
            name="current"
            value={innerValue}
            inputMode="numeric"
            onChange={(evt) => {
              const value = evt.currentTarget.value

              setInnerValue(value)
            }}
            className="w-8 bg-transparent text-center text-xs outline-hidden"
            onBlur={async () => {
              setHadLostFocus(true)

              await handleChange()
            }}
            onClick={(evt) => {
              const input = evt.currentTarget

              if (hadLostFocus) {
                input.select()
                setHadLostFocus(false)
              }
            }}
            autoCapitalize="off"
            autoCorrect="off"
            autoComplete="off"
            max={maxIndex + 1}
            min={1}
          />
        </form>
        <span className="text-xs">{maxIndex + 1}</span>
      </div>
      <Button size="icon-sm" variant="secondary" onClick={onInnerNext}>
        <ChevronRightIcon />
      </Button>
    </div>
  )
}
