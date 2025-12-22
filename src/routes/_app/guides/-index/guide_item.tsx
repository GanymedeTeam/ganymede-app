import { Trans } from '@lingui/react/macro'
import { Link } from '@tanstack/react-router'
import { cva } from 'class-variance-authority'
import { FileDownIcon, ThumbsDownIcon, ThumbsUpIcon, VerifiedIcon } from 'lucide-react'
import { DownloadImage } from '@/components/download_image.tsx'
import { FlagPerLang } from '@/components/flag_per_lang.tsx'
import { GameIcon } from '@/components/game_icon.tsx'
import { GuideDownloadButton } from '@/components/guide_download_button.tsx'
import { Card } from '@/components/ui/card.tsx'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip.tsx'
import { GameType, Guide, GuidesOrFolder } from '@/ipc/bindings.ts'
import { GuideWithStepsWithFolder } from '@/ipc/ipc.ts'
import { clamp } from '@/lib/clamp.ts'
import { cn } from '@/lib/utils.ts'

type GuideWithFolder = Extract<GuidesOrFolder, { type: 'guide' }> & Pick<GuideWithStepsWithFolder, 'folder'>
type LocalGuide = GuideWithFolder & { currentStep: number | null }

type LocalGuideItemProps = {
  variant: 'local'
  guide: LocalGuide
  isSelected: boolean
  onSelect: (guide: GuideWithFolder) => void
  isSelectMode: boolean
  intl?: never
  isGuideDownloaded?: never
  currentStep?: never
}

type ServerGuideItemProps = {
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

// Single SVG gradient definition - rendered once, reused via url(#goldGradient)
function GoldGradientDefs() {
  return (
    <svg className="absolute" height="0" width="0">
      <defs>
        <linearGradient id="goldGradient" x1="0%" x2="100%" y1="0%" y2="100%">
          <stop offset="0%" stopColor="var(--color-accent-light, #fceaa8)" />
          <stop offset="50%" stopColor="var(--color-accent-DEFAULT, #e7c272)" />
          <stop offset="100%" stopColor="var(--color-accent-dark, #D7B363)" />
        </linearGradient>
      </defs>
    </svg>
  )
}

// Gold chevron icon
function GoldChevron({ className }: { className?: string }) {
  return (
    <svg
      className={cn('size-7', className)}
      fill="none"
      stroke="url(#goldGradient)"
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth="2.5"
      viewBox="0 0 24 24"
    >
      <path d="m9 18 6-6-6-6" />
    </svg>
  )
}

// Shared icon + flag component
function GuideIcon({ nodeImage, gameType, lang }: { nodeImage: string | null; gameType?: GameType; lang: string }) {
  return (
    <div className="relative flex shrink-0 items-center justify-center">
      {nodeImage ? (
        <DownloadImage className="size-14 rounded-lg object-cover" src={nodeImage} />
      ) : (
        <GameIcon className="size-14" gameType={gameType ?? 'dofus'} />
      )}
      <div className="absolute top-0.5 left-0.5">
        <FlagPerLang className="size-4" lang={lang} />
      </div>
    </div>
  )
}

const guideItemVariants = cva(
  'flex gap-3 xs:gap-3 p-2 hover:bg-surface-inset/70 transition-colors bg-surface-card rounded-xl border border-border-muted shadow-[0_0.3125rem_0.875rem_rgba(0,0,0,0.5)]',
  {
    variants: {
      variant: {
        local: 'aria-selected:border-accent aria-selected:bg-surface-inset',
        server: 'relative',
      },
    },
    defaultVariants: {
      variant: 'local',
    },
  },
)

export function GuideItem(props: GuideItemProps) {
  if (props.variant === 'local') {
    return <LocalGuideItem {...props} />
  }
  return <ServerGuideItem {...props} />
}

function LocalGuideItem({ guide, isSelected, onSelect, isSelectMode }: LocalGuideItemProps) {
  const totalSteps = guide.steps.length
  const currentStepIndex = guide.currentStep ?? 0
  const step = clamp(currentStepIndex + 1, 1, totalSteps)
  const percentage = Math.round((step / totalSteps) * 100)
  const isFinished = guide.currentStep !== null && guide.currentStep >= totalSteps - 1

  return (
    <Card
      aria-selected={isSelected}
      asChild
      className={guideItemVariants({
        variant: 'local',
        className: cn(isSelected && 'cursor-pointer **:cursor-pointer'),
      })}
      key={guide.id}
      onClick={(evt) => {
        if (isSelectMode) {
          evt.preventDefault()
          evt.stopPropagation()
          onSelect(guide)
        }
      }}
    >
      <li>
        <GuideIcon gameType={guide.game_type} lang={guide.lang} nodeImage={guide.node_image} />

        <div className="flex min-w-0 grow flex-col justify-center gap-1.5">
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <h3 className="line-clamp-2 w-full cursor-default font-semibold text-sm leading-tight">{guide.name}</h3>
              </TooltipTrigger>
              <TooltipContent className="max-w-[250px]" side="top">
                {guide.name}
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
          <div className="flex w-full items-center gap-2">
            {/* Mobile: percentage badge with progress */}
            <div className="relative flex xs:hidden h-4 w-full min-w-[48px] items-center justify-center overflow-hidden rounded-md border border-border-inset bg-surface-inset">
              <div
                className={cn('absolute inset-y-0 left-0', isFinished ? 'bg-success' : 'bg-success/80')}
                style={{ width: `${percentage}%` }}
              />
              <span className="relative z-10 select-none px-1.5 font-medium text-white text-xs drop-shadow-md">
                {percentage}%
              </span>
            </div>
            {/* Larger screens: full progress bar */}
            <div className="relative xs:flex hidden h-5 w-full max-w-[200px] items-center justify-center overflow-hidden rounded-[6px] border border-border-inset bg-surface-inset">
              <div
                className={cn(
                  'absolute inset-y-0 left-0 transition-all duration-300',
                  isFinished ? 'bg-success' : 'bg-success/80',
                )}
                style={{ width: `${percentage}%` }}
              />
              <span className="relative z-10 select-none font-medium text-white text-xs drop-shadow-md">
                {isFinished ? '100% - Terminé' : `${percentage}% - (${step}/${totalSteps})`}
              </span>
            </div>
          </div>
        </div>

        {!isSelectMode && (
          <div className="flex items-center gap-1 pl-1">
            <GoldGradientDefs />
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <svg className="size-6 cursor-help" fill="none" viewBox="0 0 24 24">
                    <circle
                      cx="12"
                      cy="12"
                      fill={isFinished ? 'url(#goldGradient)' : percentage === 0 ? '#6B7280' : 'none'}
                      r="10"
                      stroke={percentage > 0 ? 'url(#goldGradient)' : 'none'}
                      strokeWidth="2"
                    />
                    <path
                      d="M8 12.5L11 15.5L16.5 9"
                      fill="none"
                      stroke={isFinished ? '#21303C' : percentage > 0 ? 'url(#goldGradient)' : '#3a3f47'}
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={isFinished ? '2.5' : '2'}
                    />
                  </svg>
                </TooltipTrigger>
                <TooltipContent side="bottom">
                  {isFinished ? (
                    <Trans>Terminé</Trans>
                  ) : percentage > 0 ? (
                    <Trans>En cours</Trans>
                  ) : (
                    <Trans>Non commencé</Trans>
                  )}
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
            <Link
              className="flex items-center"
              params={{ id: guide.id }}
              search={{ step: currentStepIndex }}
              to="/guides/$id"
            >
              <GoldChevron />
            </Link>
          </div>
        )}
      </li>
    </Card>
  )
}

function ServerGuideItem({ guide, intl, isGuideDownloaded, currentStep }: ServerGuideItemProps) {
  return (
    <Card className={guideItemVariants({ variant: 'server' })} key={guide.id}>
      <GoldGradientDefs />
      {/* Mobile Layout */}
      <div className="grid xs:hidden w-full grid-cols-[auto_1fr] gap-2">
        <GuideIcon gameType={guide.game_type} lang={guide.lang} nodeImage={guide.node_image} />
        <div className="flex min-w-0 flex-col gap-1 pr-16">
          <h3 className="line-clamp-2 font-semibold text-sm leading-tight">{guide.name}</h3>
          <div className="flex flex-wrap items-center gap-2 text-muted-foreground text-xxs">
            <span className="flex items-center gap-1">
              {guide.downloads !== null ? intl.format(guide.downloads) : 'N/A'}
              <FileDownIcon className="size-3" />
            </span>
            <span className="flex items-center gap-1">
              {intl.format(guide.likes)}
              <ThumbsUpIcon className="size-3" />
            </span>
            <span className="flex items-center gap-1">
              {intl.format(guide.dislikes)}
              <ThumbsDownIcon className="size-3" />
            </span>
          </div>
          <p className="inline-flex items-center gap-1 text-xs">
            <Trans>
              de <span className="font-semibold text-blue-400">{guide.user.name}</span>
            </Trans>
            {guide.user.is_certified === 1 && <VerifiedIcon className="size-4 shrink-0 text-orange-300" />}
          </p>
        </div>
        <div className="absolute top-2 right-2 flex items-center gap-1">
          <GuideDownloadButton guide={guide} />
          <Link
            className={cn('flex items-center', !isGuideDownloaded && 'pointer-events-none opacity-40')}
            draggable={false}
            params={{ id: guide.id }}
            search={{ step: currentStep }}
            to="/guides/$id"
          >
            <GoldChevron />
          </Link>
        </div>
      </div>

      {/* Larger screens */}
      <div className="xs:flex hidden w-full xs:items-center xs:gap-3">
        <GuideIcon gameType={guide.game_type} lang={guide.lang} nodeImage={guide.node_image} />

        <div className="flex min-w-0 grow flex-col justify-center gap-1">
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <h3 className="line-clamp-2 cursor-default font-semibold text-sm leading-tight">{guide.name}</h3>
              </TooltipTrigger>
              <TooltipContent className="max-w-[250px]" side="top">
                {guide.name}
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
          <div className="flex items-center gap-3 text-muted-foreground text-xxs">
            <span className="flex items-center gap-1">
              {guide.downloads !== null ? intl.format(guide.downloads) : 'N/A'}
              <FileDownIcon className="size-3" />
            </span>
            <span className="flex items-center gap-1">
              {intl.format(guide.likes)}
              <ThumbsUpIcon className="size-3" />
            </span>
            <span className="flex items-center gap-1">
              {intl.format(guide.dislikes)}
              <ThumbsDownIcon className="size-3" />
            </span>
          </div>
          <p className="inline-flex items-center gap-1 text-xs">
            <Trans>
              de <span className="font-semibold text-blue-400">{guide.user.name}</span>
            </Trans>
            {guide.user.is_certified === 1 && <VerifiedIcon className="size-3 xs:size-4 text-orange-300" />}
          </p>
        </div>

        <div className="flex items-center gap-1 pl-1">
          <GuideDownloadButton guide={guide} />
          <Link
            className={cn('flex items-center', !isGuideDownloaded && 'pointer-events-none opacity-40')}
            draggable={false}
            params={{ id: guide.id }}
            search={{ step: currentStep }}
            to="/guides/$id"
          >
            <GoldChevron />
          </Link>
        </div>
      </div>
    </Card>
  )
}
