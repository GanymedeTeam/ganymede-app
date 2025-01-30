import * as React from 'react'

import { cn } from '@/lib/utils.ts'
import { XIcon } from 'lucide-react'
import { Input } from './input'

export interface ClearInputProps extends React.ComponentPropsWithRef<'input'> {
  onValueChange?: (value: string) => void
}

function ClearInput({ className, onValueChange, value, type, ref, ...props }: ClearInputProps) {
  return (
    <div className="relative z-0 flex w-full">
      <Input
        className={cn('peer bg-primary/80', className)}
        type={type}
        {...props}
        value={value}
        onKeyDown={(evt) => {
          if (evt.key === 'Escape') {
            evt.preventDefault()
            evt.stopPropagation()
            onValueChange?.('')
          }
        }}
        ref={ref}
      />
      <button
        type="button"
        className="center-y-absolute right-2 opacity-0 transition-opacity peer-has-value:opacity-100"
        onClick={() => {
          onValueChange?.('')
        }}
      >
        <XIcon className="size-4" />
      </button>
    </div>
  )
}

export { ClearInput }
