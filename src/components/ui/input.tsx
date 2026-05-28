import * as React from 'react'

import { cn } from '@/lib/utils.ts'

export interface InputProps extends React.ComponentPropsWithRef<'input'> {}

function Input({ className, type, ref, ...props }: InputProps) {
  return (
    <input
      autoCapitalize="off"
      autoComplete="off"
      autoCorrect="off"
      className={cn(
        'flex h-6 w-full rounded-md border border-border-muted bg-surface-inset px-2 py-0.5 text-xs shadow-xs transition-colors file:border-0 file:bg-transparent file:text-sm file:font-medium file:text-foreground placeholder:text-muted-foreground focus-visible:ring-1 focus-visible:ring-ring focus-visible:outline-hidden disabled:cursor-not-allowed disabled:opacity-50 sm:h-9 sm:px-3 sm:py-1 sm:text-sm',
        className,
      )}
      ref={ref}
      type={type}
      {...props}
    />
  )
}

export { Input }
