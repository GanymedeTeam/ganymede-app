import { cn } from '@/lib/utils.ts'
import { Slot } from '@radix-ui/react-slot'
import { ComponentProps } from 'react'

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
        'sticky top-[30px] z-10 flex h-[30px] w-full items-center justify-between bg-primary-800 p-1 font-semibold text-primary-foreground sm:h-[36px] sm:px-2',
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
    <Comp data-slot="page-title-text" className={cn('text-xs xs:text-sm sm:text-base', className)} {...props}>
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
