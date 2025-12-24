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
      className={cn('rounded-xl border border-border-muted bg-surface-card text-card-foreground shadow-sm', className)}
      data-slot="card"
      ref={ref}
      {...props}
    />
  )
}

function CardHeader({ className, ref, ...props }: React.ComponentPropsWithRef<'div'>) {
  return (
    <div className={cn('flex flex-col gap-y-1.5 p-3 xs:p-6', className)} data-slot="card-header" ref={ref} {...props} />
  )
}

function CardTitle({ className, ref, ...props }: React.ComponentPropsWithRef<'div'>) {
  return (
    <div
      className={cn('text-sm xs:text-base leading-none tracking-tight', className)}
      data-slot="card-title"
      ref={ref}
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
      className={cn('text-muted-foreground text-xs xs:text-sm', className)}
      data-slot="card-description"
      ref={ref}
      {...props}
    />
  )
}

function CardContent({ className, ref, ...props }: React.ComponentPropsWithRef<'div'>) {
  return (
    <div
      className={cn('p-3 xs:p-6 pt-0 text-xs xs:text-base', className)}
      data-slot="card-content"
      ref={ref}
      {...props}
    />
  )
}

function CardFooter({ className, ref, ...props }: React.ComponentPropsWithRef<'div'>) {
  return (
    <div className={cn('flex items-center p-3 xs:p-6 pt-0', className)} data-slot="card-footer" ref={ref} {...props} />
  )
}

export { Card, CardHeader, CardFooter, CardTitle, CardDescription, CardContent }
