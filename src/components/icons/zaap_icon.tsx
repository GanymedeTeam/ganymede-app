import { type ComponentProps } from 'react'

import zaapIcon from '@/assets/icons/zaap.png'
import { cn } from '@/lib/utils.ts'

export function ZaapIcon({ className, ...props }: Omit<ComponentProps<'img'>, 'src'>) {
  return <img alt="zaap" className={cn('size-5 select-none', className)} draggable={false} src={zaapIcon} {...props} />
}
