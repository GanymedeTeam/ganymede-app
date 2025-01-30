import * as React from 'react'
import * as AlertDialogPrimitive from '@radix-ui/react-alert-dialog'

import { cn } from '@/lib/utils.ts'
import { buttonVariants } from '@/components/ui/button'

const AlertDialog = AlertDialogPrimitive.Root

const AlertDialogTrigger = AlertDialogPrimitive.Trigger

const AlertDialogPortal = AlertDialogPrimitive.Portal

function AlertDialogOverlay({
  className,
  ref,
  ...props
}: React.ComponentPropsWithRef<typeof AlertDialogPrimitive.Overlay>) {
  return (
    <AlertDialogPrimitive.Overlay
      className={cn(
        'data-[state=closed]:fade-out-0 data-[state=open]:fade-in-80 fixed inset-0 z-50 bg-black/80 data-[state=closed]:animate-out data-[state=open]:animate-in',
        className,
      )}
      {...props}
      ref={ref}
    />
  )
}

function AlertDialogContent({
  className,
  ref,
  ...props
}: React.ComponentPropsWithRef<typeof AlertDialogPrimitive.Content>) {
  return (
    <AlertDialogPortal>
      <AlertDialogOverlay />
      <AlertDialogPrimitive.Content
        ref={ref}
        className={cn(
          'data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 fixed top-[50%] left-[50%] z-50 grid w-full max-w-lg translate-x-[-50%] translate-y-[-50%] gap-4 border bg-background p-6 shadow-lg duration-200 data-[state=closed]:animate-out data-[state=open]:animate-in sm:rounded-lg',
          className,
        )}
        {...props}
      />
    </AlertDialogPortal>
  )
}

const AlertDialogHeader = ({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) => (
  <div className={cn('flex flex-col space-y-2 text-center sm:text-left', className)} {...props} />
)

const AlertDialogFooter = ({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) => (
  <div className={cn('flex flex-col-reverse sm:flex-row sm:justify-end sm:space-x-2', className)} {...props} />
)

function AlertDialogTitle({
  className,
  ref,
  ...props
}: React.ComponentPropsWithRef<typeof AlertDialogPrimitive.Title>) {
  return <AlertDialogPrimitive.Title ref={ref} className={cn('font-semibold text-lg', className)} {...props} />
}

function AlertDialogDescription({
  className,
  ref,
  ...props
}: React.ComponentPropsWithRef<typeof AlertDialogPrimitive.Description>) {
  return (
    <AlertDialogPrimitive.Description ref={ref} className={cn('text-muted-foreground text-sm', className)} {...props} />
  )
}

function AlertDialogAction({
  className,
  ref,
  ...props
}: React.ComponentPropsWithRef<typeof AlertDialogPrimitive.Action>) {
  return <AlertDialogPrimitive.Action ref={ref} className={cn(buttonVariants(), className)} {...props} />
}

function AlertDialogCancel({
  className,
  ref,
  ...props
}: React.ComponentPropsWithRef<typeof AlertDialogPrimitive.Cancel>) {
  return (
    <AlertDialogPrimitive.Cancel
      ref={ref}
      className={cn(buttonVariants({ variant: 'outline' }), 'mt-2 sm:mt-0', className)}
      {...props}
    />
  )
}

export {
  AlertDialog,
  AlertDialogPortal,
  AlertDialogOverlay,
  AlertDialogTrigger,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogFooter,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogAction,
  AlertDialogCancel,
}
