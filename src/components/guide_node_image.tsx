import { DownloadImage } from '@/components/download_image.tsx'
import { GameIcon } from '@/components/game_icon.tsx'
import { GuideWithSteps } from '@/ipc/bindings.ts'

export function GuideNodeImage({ guide }: { guide: Pick<GuideWithSteps, 'node_image' | 'game_type'> }) {
  return guide.node_image ? (
    <DownloadImage className="size-6 shrink-0 rounded object-cover" src={guide.node_image} />
  ) : (
    <div className="flex shrink-0 items-center justify-center rounded text-primary-foreground">
      <GameIcon className="size-6" gameType={guide.game_type ?? 'dofus'} />
    </div>
  )
}
