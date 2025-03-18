import * as TabsPrimitive from '@radix-ui/react-tabs'
import React from 'react'

import { cn } from '@/lib/utils.ts'

const Tabs = TabsPrimitive.Root

function TabsList({ className, ref, ...props }: React.ComponentPropsWithRef<typeof TabsPrimitive.List>) {
  return (
    <TabsPrimitive.List
      ref={ref}
      className={cn('flex h-7.5 w-full bg-primary-800 text-primary-foreground-800 sm:h-9 sm:px-1', className)}
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
      ref={ref}
      className={cn(
        'line-clamp-1 block w-full grow text-ellipsis whitespace-nowrap px-2 py-1 font-medium text-xs xs:text-sm leading-5 ring-offset-background transition-all first-tab:rounded-bl-md last-tab:rounded-br-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 group-last/tab:hidden data-[state=inactive]:bg-background data-[state=inactive]:text-foreground/75',
        className,
      )}
      {...props}
    >
      {children}
    </TabsPrimitive.Trigger>
  )
}

const TabsContent = ({ className, ref, ...props }: React.ComponentPropsWithRef<typeof TabsPrimitive.Content>) => (
  <TabsPrimitive.Content
    ref={ref}
    className={cn(
      'ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2',
      className,
    )}
    {...props}
  />
)

export { Tabs, TabsList, TabsTrigger, TabsContent }
