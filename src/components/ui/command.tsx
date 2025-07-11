import type { DialogProps } from '@radix-ui/react-dialog'
import { Command as CommandPrimitive } from 'cmdk'
import { Search } from 'lucide-react'
import type * as React from 'react'

import { Dialog, DialogContent } from '@/components/ui/dialog.tsx'
import { cn } from '@/lib/utils.ts'

function Command({ className, ref, ...props }: React.ComponentPropsWithRef<typeof CommandPrimitive>) {
  return (
    <CommandPrimitive
      ref={ref}
      className={cn('flex h-full w-full flex-col overflow-hidden rounded-md bg-white text-neutral-950', className)}
      {...props}
    />
  )
}

const CommandDialog = ({ children, ...props }: DialogProps) => {
  return (
    <Dialog {...props}>
      <DialogContent className="overflow-hidden p-0 shadow-lg">
        <Command className="[&_[cmdk-group-heading]]:px-2 [&_[cmdk-group-heading]]:font-medium [&_[cmdk-group-heading]]:text-muted-foreground [&_[cmdk-group]:not([hidden])_~[cmdk-group]]:pt-0 [&_[cmdk-group]]:px-2 [&_[cmdk-input-wrapper]_svg]:h-5 [&_[cmdk-input-wrapper]_svg]:w-5 [&_[cmdk-input]]:h-12 [&_[cmdk-item]]:px-2 [&_[cmdk-item]]:py-3 [&_[cmdk-item]_svg]:h-5 [&_[cmdk-item]_svg]:w-5">
          {children}
        </Command>
      </DialogContent>
    </Dialog>
  )
}

function CommandInput({ className, ref, ...props }: React.ComponentPropsWithRef<typeof CommandPrimitive.Input>) {
  return (
    <div className="flex items-center border-b px-3" cmdk-input-wrapper="">
      <Search className="mr-2 h-4 w-4 shrink-0 opacity-50" />
      <CommandPrimitive.Input
        ref={ref}
        className={cn(
          'flex h-11 w-full rounded-md bg-transparent py-3 text-sm outline-hidden placeholder:text-muted-foreground disabled:cursor-not-allowed disabled:opacity-50',
          className,
        )}
        {...props}
      />
    </div>
  )
}

function CommandList({ className, ref, ...props }: React.ComponentPropsWithRef<typeof CommandPrimitive.List>) {
  return (
    <CommandPrimitive.List
      ref={ref}
      className={cn('max-h-[300px] overflow-y-auto overflow-x-hidden', className)}
      {...props}
    />
  )
}

function CommandEmpty({ ref, ...props }: React.ComponentPropsWithRef<typeof CommandPrimitive.Empty>) {
  return <CommandPrimitive.Empty ref={ref} className="py-6 text-center text-sm" {...props} />
}

function CommandGroup({ className, ref, ...props }: React.ComponentPropsWithRef<typeof CommandPrimitive.Group>) {
  return (
    <CommandPrimitive.Group
      ref={ref}
      className={cn(
        'overflow-hidden p-1 text-neutral-950 [&_[cmdk-group-heading]]:px-2 [&_[cmdk-group-heading]]:py-1.5 [&_[cmdk-group-heading]]:font-medium [&_[cmdk-group-heading]]:text-muted-foreground [&_[cmdk-group-heading]]:text-xs',
        className,
      )}
      {...props}
    />
  )
}

function CommandSeparator({
  className,
  ref,
  ...props
}: React.ComponentPropsWithRef<typeof CommandPrimitive.Separator>) {
  return <CommandPrimitive.Separator ref={ref} className={cn('-mx-1 h-px bg-border', className)} {...props} />
}

function CommandItem({ className, ref, ...props }: React.ComponentPropsWithRef<typeof CommandPrimitive.Item>) {
  return (
    <CommandPrimitive.Item
      ref={ref}
      className={cn(
        'relative flex cursor-default select-none items-center gap-2 rounded-sm px-2 py-1.5 text-sm outline-hidden hover:bg-neutral-100 data-[disabled=true]:pointer-events-none data-[disabled=true]:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0',
        className,
      )}
      {...props}
    />
  )
}

function CommandShortcut({ className, ...props }: React.HTMLAttributes<HTMLSpanElement>) {
  return <span className={cn('ml-auto text-muted-foreground text-xs tracking-widest', className)} {...props} />
}

export {
  Command,
  CommandDialog,
  CommandInput,
  CommandList,
  CommandEmpty,
  CommandGroup,
  CommandItem,
  CommandShortcut,
  CommandSeparator,
}
