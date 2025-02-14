import { ChangeStep } from '@/components/change-step.tsx'
import { GuideFrame } from '@/components/guide-frame'
import { PageContent } from '@/components/page-content.tsx'
import { PageScrollableContent } from '@/components/page-scrollable-content'
import { PageTitle, PageTitleText } from '@/components/page-title.tsx'
import { Position } from '@/components/position.tsx'
import { Button } from '@/components/ui/button.tsx'
import { useGuide } from '@/hooks/use_guide'
import { useScrollToTop } from '@/hooks/use_scroll_to_top'
import { getGuideById } from '@/lib/guide.ts'
import { OpenedGuideZod } from '@/lib/tabs.ts'
import { cn } from '@/lib/utils.ts'
import { useSetConf } from '@/mutations/set-conf.mutation.ts'
import { confQuery } from '@/queries/conf.query.ts'
import { guidesQuery } from '@/queries/guides.query.ts'
import { useLingui } from '@lingui/react/macro'
import { useSuspenseQuery } from '@tanstack/react-query'
import { Link, createFileRoute, redirect } from '@tanstack/react-router'
import { PlusIcon } from 'lucide-react'
import { useRef } from 'react'
import { z } from 'zod'
import { BackButtonLink } from '../downloads/-back-button-link.tsx'
import { GuidePageTitle } from './-guide-page-title.tsx'

const ParamsZod = z.object({
  id: z.coerce.number(),
})

const SearchZod = z.object({
  step: z.coerce.number(),
  guides: z.array(OpenedGuideZod),
})

export const Route = createFileRoute('/_app/guides/$id')({
  component: GuideIdPage,
  validateSearch: SearchZod.parse,
  params: {
    parse: ParamsZod.parse,
    stringify: (params) => ({ id: params.id.toString() }),
  },
  pendingComponent: Pending,
  beforeLoad: async ({ context: { queryClient }, params, search: { step, guides: guidesInUrl } }) => {
    // limit to 4 guides
    const guidesUrl = guidesInUrl.slice(0, 4)
    const guides = await queryClient.ensureQueryData(guidesQuery())

    const guideById = getGuideById(guides, params.id)

    if (!guideById) {
      throw redirect({
        to: '/guides',
        search: {
          path: '',
          guides: guidesUrl,
        },
      })
    }

    // has twice the same id in the list
    if (guidesUrl.length !== new Set(guidesUrl.map((g) => g.id)).size) {
      throw redirect({
        to: '/guides/$id',
        params,
        search: {
          step: 0,
          guides: guidesUrl.filter((g, i, self) => self.findIndex((gg) => gg.id === g.id) === i),
        },
      })
    }

    const currentStep = step + 1
    const totalSteps = guideById.steps.length

    if (currentStep > totalSteps) {
      throw redirect({
        to: '/guides/$id',
        params: {
          id: guideById.id,
        },
        search: {
          step: totalSteps - 1,
          guides: guidesUrl,
        },
        replace: true,
      })
    }
  },
})

function Pending() {
  return (
    <PageContent key="guide">
      <PageTitle>
        <div className="flex w-full items-center gap-2" data-slot="page-title-content">
          <BackButtonLink to="/guides" search={{ path: '', guides: [] }} />
          <PageTitleText></PageTitleText>
        </div>
      </PageTitle>
    </PageContent>
  )
}

function GuideIdPage() {
  const params = Route.useParams()
  const openedGuides = Route.useSearch({ select: (s) => s.guides })
  const index = Route.useSearch({ select: (s) => s.step })
  const conf = useSuspenseQuery(confQuery)
  const guide = useGuide(params.id)
  const setConf = useSetConf()
  const step = guide.steps[index]
  const navigate = Route.useNavigate()
  const scrollableRef = useRef<HTMLDivElement>(null)
  const stepMax = guide.steps.length - 1
  const { t } = useLingui()

  useScrollToTop(scrollableRef, [step])

  const changeStep = async (nextStep: number) => {
    await setConf.mutateAsync({
      ...conf.data,
      profiles: conf.data.profiles.map((p) => {
        if (p.id === conf.data.profileInUse) {
          const existingProgress = p.progresses.find((progress) => progress.id === guide.id)

          return {
            ...p,
            progresses: existingProgress
              ? p.progresses.map((progress) => {
                  if (progress.id === guide.id) {
                    return {
                      ...progress,
                      currentStep: nextStep < 0 ? 0 : nextStep >= guide.steps.length ? stepMax : nextStep,
                    }
                  }

                  return progress
                })
              : [
                  ...p.progresses,
                  {
                    id: guide.id,
                    currentStep: 1, // 1 means the second step
                    steps: {},
                  },
                ],
          }
        }

        return p
      }),
    })

    await navigate({
      search: {
        step: nextStep,
        guides: openedGuides.map((g) => {
          if (g.id === guide.id) {
            return { id: g.id, step: nextStep }
          }

          return g
        }),
      },
    })
  }

  const onClickPrevious = async (): Promise<boolean> => {
    if (index === 0) {
      return false
    }

    await changeStep(index - 1)

    return true
  }

  const onClickNext = async (): Promise<boolean> => {
    if (index === stepMax) {
      return false
    }

    await changeStep(index + 1)

    return true
  }

  return (
    <PageContent key="guide" className="slot-[page-title-text]:line-clamp-1 slot-[page-title-text]:leading-5">
      <div className="flex items-center gap-1 bg-primary-800 px-1">
        {openedGuides.map((guide) => {
          return (
            <GuidePageTitle
              key={guide.id}
              currentGuideId={params.id}
              guideId={guide.id}
              step={guide.step}
              openedGuides={openedGuides}
            />
          )
        })}
        <Button
          size="icon"
          className="min-h-6 min-w-6 sm:size-6"
          variant="secondary"
          disabled={openedGuides.length >= 4}
          asChild
        >
          <Link
            to="/guides"
            search={{ path: '', guides: openedGuides, from: { id: guide.id, step: index } }}
            draggable={false}
            disabled={openedGuides.length >= 4}
            title={openedGuides.length >= 4 ? t`Vous avez atteint la limite` : undefined}
          >
            <PlusIcon />
          </Link>
        </Button>
      </div>
      <PageScrollableContent hasTitleBar ref={scrollableRef}>
        <header className="fixed inset-x-0 top-[60px] z-10 bg-primary-800 sm:top-[66px]">
          <div className="relative flex h-9 items-center justify-between gap-2 p-1">
            {step && (
              <>
                {step.map !== null && step.map.toLowerCase() !== 'nomap' && (
                  <Position pos_x={step.pos_x} pos_y={step.pos_y} />
                )}
                <ChangeStep
                  key={`${guide.id}-${index}`}
                  currentIndex={index}
                  maxIndex={stepMax}
                  onPrevious={onClickPrevious}
                  onNext={onClickNext}
                  setCurrentIndex={async (currentIndex) => {
                    return changeStep(currentIndex)
                  }}
                />
              </>
            )}
          </div>
        </header>
        {step && (
          <GuideFrame
            className={cn(
              'guide px-2 xs:px-3 pt-2 xs:pt-3 leading-5 sm:px-4 sm:pt-4',
              conf.data.fontSize === 'ExtraSmall' && 'text-xs',
              conf.data.fontSize === 'Small' && 'text-sm leading-4',
              conf.data.fontSize === 'Large' && 'text-md leading-5',
              conf.data.fontSize === 'ExtraLarge' && 'text-lg leading-6',
            )}
            guideId={guide.id}
            html={step.web_text}
            openedGuides={openedGuides}
            stepIndex={index}
          />
        )}
      </PageScrollableContent>
    </PageContent>
  )
}
