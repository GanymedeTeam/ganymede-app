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
        'line-clamp-1 block w-full grow text-ellipsis whitespace-nowrap px-2 py-1 font-medium text-xs xs:text-sm leading-5 ring-offset-background transition-all first-tab:rounded-bl-md last-tab:rounded-br-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 data-[state=inactive]:bg-surface-inset data-[state=inactive]:text-foreground/75',
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
        'ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2',
        className,
      )}
      ref={ref}
      {...props}
    />
  )
}

export { Tabs, TabsList, TabsTrigger, TabsContent }
