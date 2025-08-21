import { Trans } from '@lingui/react/macro'
import { Link } from '@tanstack/react-router'
import { BookIcon, ChevronRightIcon, FileDownIcon, ThumbsDownIcon, ThumbsUpIcon, VerifiedIcon } from 'lucide-react'
import { DownloadImage } from '@/components/download_image.tsx'
import { FlagPerLang } from '@/components/flag_per_lang.tsx'
import { GuideDownloadButton } from '@/components/guide_download_button.tsx'
import { Button } from '@/components/ui/button.tsx'
import { Card } from '@/components/ui/card.tsx'
import { Guide, GuidesOrFolder } from '@/ipc/bindings.ts'
import { GuideWithStepsWithFolder } from '@/ipc/ipc.ts'
import { clamp } from '@/lib/clamp.ts'
import { cn } from '@/lib/utils.ts'

type GuideWithFolder = Extract<GuidesOrFolder, { type: 'guide' }> & Pick<GuideWithStepsWithFolder, 'folder'>

type LocalGuide = GuideWithFolder & { currentStep: number | null }

interface LocalGuideItemProps {
  variant: 'local'
  guide: LocalGuide
  isSelected: boolean
  onSelect: (guide: GuideWithFolder) => void
  isSelectMode: boolean
  intl?: never
  isGuideDownloaded?: never
  currentStep?: never
}

interface ServerGuideItemProps {
  variant: 'server'
  guide: Guide
  intl: Intl.NumberFormat
  isGuideDownloaded: boolean
  currentStep: number
  isSelected?: never
  onSelect?: never
  isSelectMode?: never
}

type GuideItemProps = LocalGuideItemProps | ServerGuideItemProps

const USE_GUIDE_IMAGE = false

interface GuideMetadataProps {
  id: number
  lang: string
  node_image: string | null
}

function GuideMetadata({ id, lang, node_image }: GuideMetadataProps) {
  return (
    <div className="flex min-w-9 flex-col items-center gap-0.5">
      {USE_GUIDE_IMAGE && (
        <div className="flex grow flex-col items-center">
          {node_image ? (
            <DownloadImage src={node_image} className="size-8 rounded object-cover" />
          ) : (
            <BookIcon className="size-6" />
          )}
        </div>
      )}
      <FlagPerLang lang={lang} />
      <span className="whitespace-nowrap text-xxs">
        <Trans>
          id <span className="text-yellow-300">{id}</span>
        </Trans>
      </span>
    </div>
  )
}

export function GuideItem(props: GuideItemProps) {
  if (props.variant === 'local') {
    return <LocalGuideItem {...props} />
  }
  return <ServerGuideItem {...props} />
}

function LocalGuideItem({ guide, isSelected, onSelect, isSelectMode }: LocalGuideItemProps) {
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
        <GuideMetadata id={guide.id} lang={guide.lang} node_image={guide.node_image} />
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

function ServerGuideItem({ guide, intl, isGuideDownloaded, currentStep }: ServerGuideItemProps) {
  return (
    <Card key={guide.id} className="flex gap-2 p-2 xs:px-3 text-xxs xs:text-sm sm:text-base">
      <GuideMetadata id={guide.id} lang={guide.lang} node_image={guide.node_image} />
      <div className="flex grow flex-col gap-1">
        <h3 className="grow text-balance">{guide.name}</h3>
        <span className="mt-2 flex flex-wrap justify-end gap-1 whitespace-nowrap text-xxs">
          {guide.downloads !== null ? intl.format(guide.downloads) : 'N/A'}
          <FileDownIcon className="size-3" />
        </span>
        <div className="flex justify-end gap-1">
          <span className="flex items-center justify-end gap-1 whitespace-nowrap text-xxs">
            {intl.format(guide.likes)}
            <ThumbsUpIcon className="size-3" />
          </span>
          <span className="flex items-center justify-end gap-1 whitespace-nowrap text-xxs">
            {intl.format(guide.dislikes)}
            <ThumbsDownIcon className="size-3" />
          </span>
        </div>
        <p className="inline-flex items-center gap-1 self-end">
          <span>
            <Trans>
              de <span className="font-semibold text-blue-400">{guide.user.name}</span>
            </Trans>
          </span>
          {guide.user.is_certified === 1 && <VerifiedIcon className="size-3 xs:size-4 text-orange-300" />}
        </p>
      </div>
      <div className="flex flex-col items-center justify-end gap-1">
        <Button variant="secondary" size="icon" disabled={!isGuideDownloaded} asChild>
          <Link to="/guides/$id" params={{ id: guide.id }} search={{ step: currentStep }} draggable={false}>
            <ChevronRightIcon />
          </Link>
        </Button>
        <GuideDownloadButton guide={guide} />
      </div>
    </Card>
  )
}
