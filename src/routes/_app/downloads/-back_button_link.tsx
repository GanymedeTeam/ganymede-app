import { type AnyRouter, Link, LinkComponentProps, type RegisteredRouter } from '@tanstack/react-router'
import { ChevronLeftIcon } from 'lucide-react'
import { Button } from '@/components/ui/button.tsx'

export function BackButtonLink<
  TRouter extends AnyRouter = RegisteredRouter,
  const TFrom extends string = string,
  const TTo extends string | undefined = undefined,
  const TMaskFrom extends string = TFrom,
  const TMaskTo extends string = '',
>({ disabled, ...props }: LinkComponentProps<'a', TRouter, TFrom, TTo, TMaskFrom, TMaskTo>) {
  return (
    <Button asChild className="min-h-6 min-w-6" disabled={disabled} size="icon" variant="secondary">
      {/* @ts-expect-error - does not want to know */}
      <Link disabled={disabled} draggable={false} {...props}>
        <ChevronLeftIcon />
      </Link>
    </Button>
  )
}
