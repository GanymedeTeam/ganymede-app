import { LoaderIcon } from 'lucide-react'
import { ComponentProps } from 'react'
import { cn } from '@/lib/utils.ts'

export function GenericLoader({ className, ...props }: ComponentProps<'svg'>) {
  return <LoaderIcon className={cn('size-8 animate-[spin_2s_linear_infinite]', className)} {...props} />
}
