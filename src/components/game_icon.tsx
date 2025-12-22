import { ComponentProps } from 'react'
import dofusIconPng from '@/assets/logos/dofus.png'
import wakfuIconPng from '@/assets/logos/wakfu.png'
import { GameType } from '@/ipc/bindings.ts'
import { cn } from '@/lib/utils.ts'

interface GameIconProps extends Omit<ComponentProps<'img'>, 'children'> {
  gameType: GameType
}

export function GameIcon({ gameType, className, ...props }: GameIconProps) {
  return (
    <img
      className={cn('size-8', className)}
      src={gameType === 'wakfu' ? wakfuIconPng : dofusIconPng}
      {...props}
      alt={gameType === 'wakfu' ? 'wakfu icon' : 'dofus icon'}
    />
  )
}
