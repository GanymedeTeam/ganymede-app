import * as TooltipPrimitive from '@radix-ui/react-tooltip'
import * as React from 'react'

import { cn } from '@/lib/utils'

function TooltipProvider({
  delayDuration = 100,
  disableHoverableContent = true,
  ...props
}: React.ComponentPropsWithRef<typeof TooltipPrimitive.Provider>) {
  return (
    <TooltipPrimitive.Provider
      delayDuration={delayDuration}
      disableHoverableContent={disableHoverableContent}
      {...props}
    />
  )
}

const Tooltip = TooltipPrimitive.Root

const TooltipTrigger = TooltipPrimitive.Trigger

function TooltipContent({
  className,
  ref,
  sideOffset = 4,
  ...props
}: React.ComponentPropsWithRef<typeof TooltipPrimitive.Content>) {
  return (
    <TooltipPrimitive.Portal>
      <TooltipPrimitive.Content
        ref={ref}
        sideOffset={sideOffset}
        className={cn(
          'fade-in-0 zoom-in-95 data-[state=closed]:fade-out-0 data-[state=closed]:zoom-out-95 data-[side=bottom]:slide-in-from-top-2 data-[side=left]:slide-in-from-right-2 data-[side=right]:slide-in-from-left-2 data-[side=top]:slide-in-from-bottom-2 z-50 animate-in overflow-hidden rounded-md bg-primary px-3 py-1.5 text-primary-foreground text-xs data-[state=closed]:animate-out',
          className,
        )}
        {...props}
      />
    </TooltipPrimitive.Portal>
  )
}

export { Tooltip, TooltipTrigger, TooltipContent, TooltipProvider }
