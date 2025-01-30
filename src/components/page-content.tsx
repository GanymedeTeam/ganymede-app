import { cn } from '@/lib/utils.ts'
import { ComponentProps } from 'react'

export function PageContent({ className, children, ...props }: ComponentProps<'div'>) {
  return (
    <div className={cn('flex grow flex-col', className)} {...props}>
      {children}
    </div>
  )
}
