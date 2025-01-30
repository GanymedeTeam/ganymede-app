import { LoaderIcon } from 'lucide-react'
import { cn } from '@/lib/utils.ts'

export function GenericLoader({ className }: { className?: string }) {
  return <LoaderIcon className={cn('size-8 animate-[spin_2s_linear_infinite]', className)} />
}
