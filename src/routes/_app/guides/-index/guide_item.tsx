import { Trans } from '@lingui/react/macro'
import { Link } from '@tanstack/react-router'
import { BookIcon, ChevronRightIcon } from 'lucide-react'
import { DownloadImage } from '@/components/download_image.tsx'
import { FlagPerLang } from '@/components/flag_per_lang.tsx'
import { GuideDownloadButton } from '@/components/guide_download_button.tsx'
import { Button } from '@/components/ui/button.tsx'
import { Card } from '@/components/ui/card.tsx'
import { GuidesOrFolder } from '@/ipc/bindings.ts'
import { GuideWithStepsWithFolder } from '@/ipc/ipc.ts'
import { clamp } from '@/lib/clamp.ts'
import { cn } from '@/lib/utils.ts'

type GuideWithFolder = Extract<GuidesOrFolder, { type: 'guide' }> & Pick<GuideWithStepsWithFolder, 'folder'>

interface GuideItemProps {
  guide: GuideWithFolder & { currentStep: number | null }
  isSelected: boolean
  onSelect: (guide: GuideWithFolder) => void
  isSelectMode: boolean
}

const USE_GUIDE_IMAGE = false

export function GuideItem({ guide, isSelected, onSelect, isSelectMode }: GuideItemProps) {
  const totalSteps = guide.steps.length
  const step = clamp((guide.currentStep ?? 0) + 1, 1, totalSteps)
  const percentage = totalSteps === 1 ? 100 : (((step - 1) / (totalSteps - 1)) * 100).toFixed(1)
  const hasOpenButton = guide.steps.length > 0

  return (
    <Card
      key={guide.id}
      aria-selected={isSelected}
      className={cn(
        'flex gap-2 p-2 xs:px-3 text-xxs xs:text-sm aria-selected:bg-accent sm:text-base',
        isSelectMode && 'cursor-pointer **:cursor-pointer',
      )}
      onClick={(evt) => {
        if (!isSelectMode) {
          return
        }

        evt.preventDefault()
        evt.stopPropagation()
        onSelect(guide)
      }}
      asChild
    >
      <li>
        <div className="flex min-w-9 flex-col items-center gap-0.5">
          {USE_GUIDE_IMAGE && (
            <div className="flex grow flex-col items-center">
              {guide.node_image ? (
                <DownloadImage src={guide.node_image} className="size-8 rounded object-cover" />
              ) : (
                <BookIcon className="size-6" />
              )}
            </div>
          )}
          <FlagPerLang lang={guide.lang} />
          <span className="whitespace-nowrap text-xxs">
            <Trans>
              id <span className="text-yellow-300">{guide.id}</span>
            </Trans>
          </span>
        </div>
        <div className="flex grow flex-col gap-1">
          <h3 className="grow text-balance">{guide.name}</h3>
          <p className="inline-flex gap-1 self-end">
            <span>
              <span className="text-yellow-300">{step}</span>/{totalSteps}
            </span>
            <span>({percentage}%)</span>
          </p>
        </div>
        <div className="flex flex-col items-center gap-1">
          {!isSelectMode && (
            <>
              <Button asChild variant="secondary" size="icon" disabled={!hasOpenButton}>
                <Link to="/guides/$id" params={{ id: guide.id }} search={{ step: step - 1 }}>
                  <ChevronRightIcon />
                </Link>
              </Button>
              <GuideDownloadButton guide={guide} />
            </>
          )}
        </div>
      </li>
    </Card>
  )
}
