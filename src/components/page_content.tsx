import { ComponentProps } from 'react'
import { cn } from '@/lib/utils.ts'

export function PageContent({ className, children, ...props }: ComponentProps<'div'>) {
  return (
    <div className={cn('flex grow flex-col', className)} data-slot="page-content" {...props}>
      {children}
    </div>
  )
}
