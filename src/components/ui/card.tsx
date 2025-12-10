import { Slot } from '@radix-ui/react-slot'
import * as React from 'react'
import { cn } from '@/lib/utils.ts'

function Card({
  className,
  asChild = false,
  ref,
  ...props
}: React.ComponentPropsWithRef<'div'> & { asChild?: boolean }) {
  const Comp = asChild ? Slot : 'div'

  return (
    <Comp
      ref={ref}
      data-slot="card"
      className={cn('rounded-xl border border-border-muted bg-surface-card text-card-foreground shadow-sm', className)}
      {...props}
    />
  )
}

function CardHeader({ className, ref, ...props }: React.ComponentPropsWithRef<'div'>) {
  return (
    <div ref={ref} data-slot="card-header" className={cn('flex flex-col gap-y-1.5 p-3 xs:p-6', className)} {...props} />
  )
}

function CardTitle({ className, ref, ...props }: React.ComponentPropsWithRef<'div'>) {
  return (
    <div
      ref={ref}
      data-slot="card-title"
      className={cn('text-sm xs:text-base leading-none tracking-tight', className)}
      {...props}
    />
  )
}

function CardDescription({
  className,
  asChild = false,
  ref,
  ...props
}: React.ComponentPropsWithRef<'div'> & { asChild?: boolean }) {
  const Comp = asChild ? Slot : 'div'

  return (
    <Comp
      ref={ref}
      data-slot="card-description"
      className={cn('text-muted-foreground text-xs xs:text-sm', className)}
      {...props}
    />
  )
}

function CardContent({ className, ref, ...props }: React.ComponentPropsWithRef<'div'>) {
  return (
    <div
      ref={ref}
      data-slot="card-content"
      className={cn('p-3 xs:p-6 pt-0 text-xs xs:text-base', className)}
      {...props}
    />
  )
}

function CardFooter({ className, ref, ...props }: React.ComponentPropsWithRef<'div'>) {
  return (
    <div ref={ref} data-slot="card-footer" className={cn('flex items-center p-3 xs:p-6 pt-0', className)} {...props} />
  )
}

export { Card, CardHeader, CardFooter, CardTitle, CardDescription, CardContent }
