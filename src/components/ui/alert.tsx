import { type VariantProps, cva } from 'class-variance-authority'
import * as React from 'react'

import { cn } from '@/lib/utils.ts'

const alertVariants = cva(
  'relative w-full rounded-lg border p-4 [&>svg~*]:pl-7 [&>svg+div]:translate-y-[-3px] [&>svg]:absolute [&>svg]:left-4 [&>svg]:top-4 [&>svg]:text-foreground',
  {
    variants: {
      variant: {
        default: 'bg-background text-foreground',
        destructive: 'border-destructive/50 bg-destructive/60 dark:border-destructive [&>svg]:text-current',
      },
    },
    defaultVariants: {
      variant: 'default',
    },
  },
)

function Alert({
  className,
  variant,
  ref,
  ...props
}: React.ComponentPropsWithRef<'div'> & VariantProps<typeof alertVariants>) {
  return <div ref={ref} role="alert" className={cn(alertVariants({ variant }), className)} {...props} />
}

function AlertTitle({ className, ref, ...props }: React.ComponentPropsWithRef<'h5'>) {
  return <h5 ref={ref} className={cn('mb-1 font-medium leading-none tracking-tight', className)} {...props} />
}

function AlertDescription({ className, ref, ...props }: React.ComponentPropsWithRef<'div'>) {
  return <div ref={ref} className={cn('text-sm [&_p]:leading-relaxed', className)} {...props} />
}

export { Alert, AlertDescription, AlertTitle }
