import * as LabelPrimitive from '@radix-ui/react-label'
import { cva, type VariantProps } from 'class-variance-authority'
import * as React from 'react'

import { cn } from '@/lib/utils.ts'

const labelVariants = cva('text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70')

export type LabelProps = React.ComponentPropsWithRef<typeof LabelPrimitive.Root> & VariantProps<typeof labelVariants>

function Label({ className, ref, ...props }: LabelProps) {
  return <LabelPrimitive.Root className={cn(labelVariants(), className)} ref={ref} {...props} />
}

export { Label }
