import * as ProgressPrimitive from '@radix-ui/react-progress'
import * as React from 'react'

import { cn } from '@/lib/utils.ts'

function Progress({ className, value, ref, ...props }: React.ComponentPropsWithRef<typeof ProgressPrimitive.Root>) {
  return (
    <ProgressPrimitive.Root
      className={cn('relative h-4 w-full overflow-hidden rounded-full bg-secondary', className)}
      ref={ref}
      {...props}
    >
      <ProgressPrimitive.Indicator
        className="h-full w-full flex-1 bg-primary transition-all"
        style={{ transform: `translateX(-${100 - (value || 0)}%)` }}
      />
    </ProgressPrimitive.Root>
  )
}

export { Progress }
