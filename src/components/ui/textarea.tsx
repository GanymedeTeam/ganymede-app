import * as React from 'react'

import { cn } from '@/lib/utils.ts'

function Textarea({ className, ref, ...props }: React.ComponentPropsWithRef<'textarea'>) {
  return (
    <textarea
      className={cn(
        'flex min-h-[60px] w-full rounded-md bg-primary-800 px-2 py-2 text-xs shadow-xs placeholder:text-muted-foreground focus-visible:outline-hidden focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50 sm:px-3 sm:text-sm',
        className,
      )}
      ref={ref}
      {...props}
    />
  )
}

export { Textarea }
