import { Slot, SlotProps } from '@radix-ui/react-slot'
import { writeText } from '@tauri-apps/plugin-clipboard-manager'
import { cn } from '@/lib/utils.ts'
import { Trans } from '@lingui/react/macro'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip.tsx'

export function CopyOnClick({ className, title, ...props }: SlotProps & { title: string }) {
  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger>
          <Slot
            onClick={async () => {
              await writeText(title)
            }}
            className={cn('cursor-pointer', className)}
            {...props}
          />
        </TooltipTrigger>
        <TooltipContent>
          <Trans>Copier : {title}</Trans>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  )
}
