import { Button } from '@/components/ui/button.tsx'
import { type AnyRouter, Link, LinkComponentProps, type RegisteredRouter } from '@tanstack/react-router'
import { ChevronLeftIcon } from 'lucide-react'

export function BackButtonLink<
  TRouter extends AnyRouter = RegisteredRouter,
  const TFrom extends string = string,
  const TTo extends string | undefined = undefined,
  const TMaskFrom extends string = TFrom,
  const TMaskTo extends string = '',
>({ disabled, ...props }: LinkComponentProps<'a', TRouter, TFrom, TTo, TMaskFrom, TMaskTo>) {
  return (
    <Button size="icon" className="min-h-6 min-w-6 sm:size-6" variant="secondary" disabled={disabled} asChild>
      {/* @ts-expect-error - does not want to know */}
      <Link draggable={false} disabled={disabled} {...props}>
        <ChevronLeftIcon />
      </Link>
    </Button>
  )
}
