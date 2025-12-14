import { Slot } from '@radix-ui/react-slot'
import { ComponentProps } from 'react'
import { cn } from '@/lib/utils.ts'

export function PageTitle({
  children,
  className,
  asChild = false,
  ...props
}: ComponentProps<'h2'> & { asChild?: boolean }) {
  const Comp = asChild ? Slot : 'h2'

  return (
    <Comp
      data-slot="page-title"
      className={cn(
        'sticky top-7.5 z-10 flex h-7.5 w-full items-center justify-between gap-2 bg-surface-card px-3 py-5 font-semibold text-primary-foreground sm:h-[36px]',
        className,
      )}
      {...props}
    >
      {children}
    </Comp>
  )
}

export function PageTitleText({
  children,
  className,
  asChild = false,
  ...props
}: ComponentProps<'span'> & { asChild?: boolean }) {
  const Comp = asChild ? Slot : 'span'

  return (
    <Comp data-slot="page-title-text" className={cn('text-xs xs:text-xl sm:text-base', className)} {...props}>
      {children}
    </Comp>
  )
}

export function PageTitleExtra({ children, className, ...props }: ComponentProps<'span'>) {
  return (
    <span className={cn('text-xs', className)} {...props}>
      {children}
    </span>
  )
}
