import { Slot } from '@radix-ui/react-slot'
import { ComponentProps } from 'react'
import { cn } from '@/lib/utils.ts'

export function BottomBar({
  asChild = false,
  className,
  children,
  ...props
}: ComponentProps<'div'> & { asChild?: boolean }) {
  const Comp = asChild ? Slot : 'div'

  return (
    <Comp
      className={cn(
        'fixed inset-x-0 bottom-0 flex h-[38px] gap-2 bg-primary px-6 pt-2 pb-3 text-primary-foreground sm:h-[52px]',
        className,
      )}
      {...props}
    >
      {children}
    </Comp>
  )
}
