import * as TabsPrimitive from '@radix-ui/react-tabs'
import type React from 'react'

import { cn } from '@/lib/utils.ts'

const Tabs = TabsPrimitive.Root

function TabsList({ className, ref, ...props }: React.ComponentPropsWithRef<typeof TabsPrimitive.List>) {
  return (
    <TabsPrimitive.List
      className={cn('flex h-7.5 w-full gap-1 bg-surface-inset text-primary-foreground-800 sm:h-9', className)}
      ref={ref}
      {...props}
    />
  )
}

function TabsTrigger({
  className,
  children,
  ref,
  ...props
}: React.ComponentPropsWithRef<typeof TabsPrimitive.Trigger>) {
  return (
    <TabsPrimitive.Trigger
      className={cn(
        'line-clamp-1 block w-full grow px-2 py-1 text-xs leading-5 font-medium text-ellipsis whitespace-nowrap ring-offset-background transition-all focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:outline-none disabled:pointer-events-none disabled:opacity-50 data-[state=inactive]:bg-surface-inset data-[state=inactive]:text-foreground/75 xs:text-sm first-tab:rounded-bl-md last-tab:rounded-br-md',
        className,
      )}
      ref={ref}
      {...props}
    >
      {children}
    </TabsPrimitive.Trigger>
  )
}

function TabsContent({ className, ref, ...props }: React.ComponentPropsWithRef<typeof TabsPrimitive.Content>) {
  return (
    <TabsPrimitive.Content
      className={cn(
        'ring-offset-background focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:outline-none',
        className,
      )}
      ref={ref}
      {...props}
    />
  )
}

export { Tabs, TabsList, TabsTrigger, TabsContent }
