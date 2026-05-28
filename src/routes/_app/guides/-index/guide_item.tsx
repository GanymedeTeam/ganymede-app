import { Trans, useLingui } from '@lingui/react/macro'
import { Link } from '@tanstack/react-router'
import { cva } from 'class-variance-authority'
import { FileDownIcon, PinIcon, PinOffIcon, ThumbsDownIcon, ThumbsUpIcon, VerifiedIcon } from 'lucide-react'
import { toast } from 'sonner'

import { DownloadImage } from '@/components/download_image.tsx'
import { FlagPerLang } from '@/components/flag_per_lang.tsx'
import { GameIcon } from '@/components/game_icon.tsx'
import { GuideDownloadButton } from '@/components/guide_download_button.tsx'
import { Card } from '@/components/ui/card.tsx'
import { ContextMenu, ContextMenuContent, ContextMenuItem, ContextMenuTrigger } from '@/components/ui/context_menu.tsx'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip.tsx'
import { useProfile } from '@/hooks/use_profile.ts'
import { GameType, Guide, GuidesOrFolder } from '@/ipc/bindings.ts'
import { GuideWithStepsWithFolder } from '@/ipc/ipc.ts'
import { clamp } from '@/lib/clamp.ts'
import { cn } from '@/lib/utils.ts'
import { MAX_PINNED_PER_PROFILE, useTogglePinnedGuide } from '@/mutations/toggle_pinned_guide.mutation.ts'

type GuideWithFolder = Extract<GuidesOrFolder, { type: 'guide' }> & Pick<GuideWithStepsWithFolder, 'folder'>
type LocalGuide = GuideWithFolder & { currentStep: number | null }

type LocalGuideItemProps = {
  variant: 'local'
  guide: LocalGuide
  isSelected: boolean
  onSelect: (guide: GuideWithFolder) => void
  isSelectMode: boolean
  isPinned: boolean
  pinnedCount: number
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
  isPinned?: never
  pinnedCount?: never
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
function GuideIcon({
  id,
  nodeImage,
  gameType,
  lang,
  isPinned,
}: {
  id: number
  nodeImage: string | null
  gameType?: GameType
  lang: string
  isPinned?: boolean
}) {
  return (
    <TooltipProvider delayDuration={400}>
      <Tooltip>
        <TooltipTrigger asChild>
          <div className="relative flex shrink-0 items-center justify-center">
            {nodeImage ? (
              <DownloadImage className="size-14 rounded-lg object-cover" src={nodeImage} />
            ) : (
              <GameIcon className="size-14" gameType={gameType ?? 'dofus'} />
            )}
            <div className="absolute top-0.5 left-0.5">
              <FlagPerLang className="size-4" lang={lang} />
            </div>
            {isPinned && (
              <div className="absolute top-0.5 right-0.5 flex size-4 items-center justify-center rounded-full bg-accent text-accent-foreground shadow">
                <PinIcon className="size-2.5" fill="currentColor" />
              </div>
            )}
          </div>
        </TooltipTrigger>
        <TooltipContent>ID: {id}</TooltipContent>
      </Tooltip>
    </TooltipProvider>
  )
}

const guideItemVariants = cva(
  'flex gap-3 rounded-xl border border-border-muted bg-surface-card p-2 shadow-[0_0.3125rem_0.875rem_rgba(0,0,0,0.5)] transition-colors hover:bg-surface-inset/70 xs:gap-3',
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

function LocalGuideItem({ guide, isSelected, onSelect, isSelectMode, isPinned, pinnedCount }: LocalGuideItemProps) {
  const { t } = useLingui()
  const profile = useProfile()
  const togglePinned = useTogglePinnedGuide()
  const totalSteps = guide.steps.length
  const currentStepIndex = guide.currentStep ?? 0
  const step = clamp(currentStepIndex + 1, 1, totalSteps)
  const percentage = Math.round((step / totalSteps) * 100)
  const isFinished = guide.currentStep !== null && guide.currentStep >= totalSteps - 1

  const onTogglePin = () => {
    if (!isPinned && pinnedCount >= MAX_PINNED_PER_PROFILE) {
      toast.error(t`Limite de ${MAX_PINNED_PER_PROFILE} guides épinglés atteinte.`)
      return
    }

    togglePinned.mutate({ profileId: profile.id, guideId: guide.id, pinned: !isPinned })
  }

  const card = (
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
        <GuideIcon
          gameType={guide.game_type}
          id={guide.id}
          isPinned={isPinned}
          lang={guide.lang}
          nodeImage={guide.node_image}
        />

        <div className="flex min-w-0 grow flex-col justify-center gap-1.5">
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <h3 className="line-clamp-2 w-full cursor-default text-sm leading-tight font-semibold">{guide.name}</h3>
              </TooltipTrigger>
              <TooltipContent className="max-w-[250px]" side="top">
                {guide.name}
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
          <div className="flex w-full items-center gap-2">
            {/* Mobile: percentage badge with progress */}
            <div className="relative flex h-4 w-full min-w-[48px] items-center justify-center overflow-hidden rounded-md border border-border-inset bg-surface-inset xs:hidden">
              <div
                className={cn('absolute inset-y-0 left-0', isFinished ? 'bg-success' : 'bg-success/80')}
                style={{ width: `${percentage}%` }}
              />
              <span className="relative z-10 px-1.5 text-xs font-medium text-white drop-shadow-md select-none">
                {percentage}%
              </span>
            </div>
            {/* Larger screens: full progress bar */}
            <div className="relative hidden h-5 w-full max-w-[200px] items-center justify-center overflow-hidden rounded-[6px] border border-border-inset bg-surface-inset xs:flex">
              <div
                className={cn(
                  'absolute inset-y-0 left-0 transition-all duration-300',
                  isFinished ? 'bg-success' : 'bg-success/80',
                )}
                style={{ width: `${percentage}%` }}
              />
              <span className="relative z-10 text-xs font-medium text-white drop-shadow-md select-none">
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

  if (isSelectMode) {
    return card
  }

  return (
    <ContextMenu>
      <ContextMenuTrigger asChild>{card}</ContextMenuTrigger>
      <ContextMenuContent>
        <ContextMenuItem onSelect={onTogglePin}>
          {isPinned ? (
            <>
              <PinOffIcon className="size-4" />
              <Trans>Désépingler</Trans>
            </>
          ) : (
            <>
              <PinIcon className="size-4" />
              <Trans>Épingler</Trans>
            </>
          )}
        </ContextMenuItem>
      </ContextMenuContent>
    </ContextMenu>
  )
}

function ServerGuideItem({ guide, intl, isGuideDownloaded, currentStep }: ServerGuideItemProps) {
  return (
    <Card className={guideItemVariants({ variant: 'server' })} key={guide.id}>
      <GoldGradientDefs />
      {/* Mobile Layout */}
      <div className="grid w-full grid-cols-[auto_1fr] gap-2 xs:hidden">
        <GuideIcon gameType={guide.game_type} id={guide.id} lang={guide.lang} nodeImage={guide.node_image} />
        <div className="flex min-w-0 flex-col gap-1 pr-16">
          <h3 className="line-clamp-2 text-sm leading-tight font-semibold">{guide.name}</h3>
          <div className="flex flex-wrap items-center gap-2 text-xxs text-muted-foreground">
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
      <div className="hidden w-full xs:flex xs:items-center xs:gap-3">
        <GuideIcon gameType={guide.game_type} id={guide.id} lang={guide.lang} nodeImage={guide.node_image} />

        <div className="flex min-w-0 grow flex-col justify-center gap-1">
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <h3 className="line-clamp-2 cursor-default text-sm leading-tight font-semibold">{guide.name}</h3>
              </TooltipTrigger>
              <TooltipContent className="max-w-[250px]" side="top">
                {guide.name}
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
          <div className="flex items-center gap-3 text-xxs text-muted-foreground">
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
            {guide.user.is_certified === 1 && <VerifiedIcon className="size-3 text-orange-300 xs:size-4" />}
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
