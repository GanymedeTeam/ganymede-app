import { type SVGProps } from 'react'
import { GameType } from '@/ipc/bindings.ts'
import { cn } from '@/lib/utils.ts'

interface GameIconProps extends Omit<SVGProps<SVGSVGElement>, 'children'> {
  gameType: GameType
}

export function GameIcon({ gameType, className, ...props }: GameIconProps) {
  if (gameType === 'wakfu') {
    return <WakfuIcon className={className} {...props} />
  }
  return <DofusIcon className={className} {...props} />
}

function DofusIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={cn('size-4', props.className)}
      {...props}
    >
      <title>Dofus</title>
      <circle cx="12" cy="12" r="10" fill="#E8B960" stroke="#8B5A3C" strokeWidth="1.5" />
      <path d="M12 6 L15 12 L12 18 L9 12 Z" fill="#8B5A3C" />
      <circle cx="12" cy="12" r="3" fill="#FFF" fillOpacity="0.3" />
    </svg>
  )
}

function WakfuIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={cn('size-4', props.className)}
      {...props}
    >
      <title>Wakfu</title>
      <path d="M12 2 L16 8 L22 10 L16 12 L12 18 L8 12 L2 10 L8 8 Z" fill="#4A9FD8" stroke="#2C5F8D" strokeWidth="1.5" />
      <circle cx="12" cy="10" r="2.5" fill="#FFF" fillOpacity="0.4" />
    </svg>
  )
}
