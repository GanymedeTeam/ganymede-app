import { PageTitle, PageTitleText } from '@/components/page-title.tsx'
import { Button } from '@/components/ui/button.tsx'
import { useGuide } from '@/hooks/use_guide.ts'
import { OpenedGuide } from '@/lib/tabs.ts'
import { cn } from '@/lib/utils.ts'
import { Link } from '@tanstack/react-router'
import { XIcon } from 'lucide-react'

export function GuidePageTitle({
  guideId,
  step,
  currentGuideId,
  openedGuides,
}: {
  guideId: number
  step: number
  currentGuideId: number
  openedGuides: OpenedGuide[]
}) {
  const guide = useGuide(guideId)

  const currentIndexInOpened = openedGuides.length > 1 ? openedGuides.findIndex((guide) => guide.id === guideId) : -1
  const previousGuide = currentIndexInOpened !== -1 ? openedGuides.at(currentIndexInOpened - 1) : undefined

  return (
    <div className="group relative w-full">
      <PageTitle
        className={cn(
          'rounded-b-lg',
          openedGuides.length > 1 && 'hover:bg-primary-900 data-[page=current]:bg-primary-900',
        )}
        data-page={guide.id === currentGuideId ? 'current' : undefined}
        title={guide.name}
        asChild
      >
        <Link draggable={false} to="/guides/$id" params={{ id: guideId }} search={{ step, guides: openedGuides }}>
          <div className="flex w-full items-center justify-center gap-2" data-slot="page-title-content">
            <PageTitleText>{guide.name}</PageTitleText>
          </div>
        </Link>
      </PageTitle>

      <Button
        type="button"
        className="center-y-absolute invisible absolute right-1 z-10 size-5 min-h-5 max-w-5 group-hover:visible"
        asChild
      >
        {previousGuide ? (
          <Link
            draggable={false}
            to="/guides/$id"
            params={{ id: previousGuide.id }}
            search={{ step: previousGuide.step, guides: openedGuides.filter((g) => g.id !== guide.id) }}
          >
            <XIcon />
          </Link>
        ) : (
          <Link draggable={false} to="/guides" search={{ path: '', guides: [] }}>
            <XIcon />
          </Link>
        )}
      </Button>
    </div>
  )
}
