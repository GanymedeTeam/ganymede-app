import { LoaderIcon } from 'lucide-react'
import { cn } from '@/lib/utils.ts'
import { ComponentProps } from 'react'

export function GenericLoader({ className, ...props }: ComponentProps<'svg'>) {
  return <LoaderIcon className={cn('size-8 animate-[spin_2s_linear_infinite]', className)} {...props} />
}
