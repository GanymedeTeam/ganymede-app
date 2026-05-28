import { cva, type VariantProps } from 'class-variance-authority'
import * as React from 'react'

import { cn } from '@/lib/utils.ts'

const alertVariants = cva(
  'relative w-full rounded-lg border p-4 [&>svg]:absolute [&>svg]:top-4 [&>svg]:left-4 [&>svg]:text-foreground [&>svg+div]:translate-y-[-3px] [&>svg~*]:pl-7',
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
  return <div className={cn(alertVariants({ variant }), className)} ref={ref} role="alert" {...props} />
}

function AlertTitle({ className, ref, ...props }: React.ComponentPropsWithRef<'h5'>) {
  return <h5 className={cn('mb-1 leading-none font-medium tracking-tight', className)} ref={ref} {...props} />
}

function AlertDescription({ className, ref, ...props }: React.ComponentPropsWithRef<'div'>) {
  return <div className={cn('text-sm [&_p]:leading-relaxed', className)} ref={ref} {...props} />
}

export { Alert, AlertDescription, AlertTitle }
