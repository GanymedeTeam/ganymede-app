import { useEffect, useRef, useState } from 'react'
import { cn } from '@/lib/utils'

export function InvisibleInput({
  value,
  max,
  min,
  gap = 0,
  onChange,
  onSubmit,
  className,
}: {
  value: string
  max: number
  min: number
  gap?: number
  onChange: (value: string) => void
  onSubmit: (value: string) => Promise<void> | void
  className?: string
}) {
  const [innerValue, setInnerValue] = useState(value)
  const [hadLostFocus, setHadLostFocus] = useState(true)
  const formRef = useRef<HTMLFormElement>(null)

  useEffect(() => {
    if (innerValue !== value) {
      setInnerValue(value)
    }
  }, [value, innerValue])

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

    if (Number.isNaN(number) || number < min) {
      return
    }

    const numberIndex = number - gap
    const nextStepIndex = numberIndex > max ? max : numberIndex

    await onSubmit(nextStepIndex.toString())

    setInnerValue((nextStepIndex + gap).toString())
  }

  return (
    <form
      onSubmit={async (evt) => {
        evt.preventDefault()
        await handleChange()
      }}
      ref={formRef}
    >
      <input
        autoCapitalize="off"
        autoComplete="off"
        autoCorrect="off"
        className={cn('w-8 bg-transparent text-center text-xs outline-hidden', className)}
        inputMode="numeric"
        max={max + gap}
        min={min}
        name="current"
        onBlur={async () => {
          setHadLostFocus(true)
          await handleChange()
        }}
        onChange={(evt) => {
          const value = evt.currentTarget.value
          setInnerValue(value)
          onChange(value)
        }}
        onClick={(evt) => {
          const input = evt.currentTarget
          if (hadLostFocus) {
            input.select()
            setHadLostFocus(false)
          }
        }}
        value={innerValue}
      />
    </form>
  )
}
