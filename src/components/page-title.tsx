import { cn } from '@/lib/utils.ts'
import { ComponentProps, PropsWithChildren } from 'react'

export function PageTitle({ children }: PropsWithChildren) {
  return (
    <h2 className="sticky top-[30px] z-10 flex h-[30px] w-full items-center justify-between bg-primary-800 p-1 font-semibold text-primary-foreground sm:h-[36px] sm:px-2">
      {children}
    </h2>
  )
}

export function PageTitleText({ children, className, ...props }: ComponentProps<'span'>) {
  return (
    <span className={cn('text-xs xs:text-sm sm:text-base', className)} {...props}>
      {children}
    </span>
  )
}

export function PageTitleExtra({ children, className, ...props }: ComponentProps<'span'>) {
  return (
    <span className={cn('text-xs', className)} {...props}>
      {children}
    </span>
  )
}
