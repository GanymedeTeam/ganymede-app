import { ChangeStep } from '@/components/change-step.tsx'
import { GenericLoader } from '@/components/generic-loader.tsx'
import { GuideFrame } from '@/components/guide-frame'
import { PageScrollableContent } from '@/components/page-scrollable-content'
import { Position } from '@/components/position.tsx'
import { useGuide } from '@/hooks/use_guide'
import { useScrollToTop } from '@/hooks/use_scroll_to_top'
import { getGuideById } from '@/lib/guide.ts'
import { cn } from '@/lib/utils'
import { useSetConf } from '@/mutations/set-conf.mutation.ts'
import { confQuery } from '@/queries/conf.query.ts'
import { guidesQuery } from '@/queries/guides.query.ts'
import { Page } from '@/routes/-page.tsx'
import { useSuspenseQuery } from '@tanstack/react-query'
import { createFileRoute, redirect } from '@tanstack/react-router'
import { useRef } from 'react'
import { z } from 'zod'
import { BackButtonLink } from '../downloads/-back-button-link'

const ParamsZod = z.object({
  id: z.coerce.number(),
})

const SearchZod = z.object({
  step: z.coerce.number(),
})

export const Route = createFileRoute('/_app/guides/$id')({
  component: GuideIdPage,
  validateSearch: SearchZod.parse,
  params: {
    parse: ParamsZod.parse,
    stringify: (params) => ({ id: params.id.toString() }),
  },
  pendingComponent: Pending,
  beforeLoad: async ({ context: { queryClient }, params, search: { step } }) => {
    const guides = await queryClient.ensureQueryData(guidesQuery())

    const guideById = getGuideById(guides, params.id)

    if (!guideById) {
      throw redirect({
        to: '/guides',
        search: {
          path: '',
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
        },
        replace: true,
      })
    }
  },
})

function Pending() {
  return (
    <Page title="" key="guide" backButton={<BackButtonLink to="/guides" search={{ path: '' }} />}>
      <PageScrollableContent hasTitleBar className="flex items-center justify-center">
        <header className="fixed inset-x-0 top-[66px] z-10 bg-primary">
          <div className="relative flex h-10 items-center justify-between gap-2 p-1"></div>
        </header>
        <div className="flex grow items-center justify-center">
          <GenericLoader />
        </div>
      </PageScrollableContent>
    </Page>
  )
}

function GuideIdPage() {
  const params = Route.useParams()
  const index = Route.useSearch({ select: (s) => s.step })
  const conf = useSuspenseQuery(confQuery)
  const guide = useGuide(params.id)
  const setConf = useSetConf()
  const step = guide.steps[index]
  const navigate = Route.useNavigate()
  const scrollableRef = useRef<HTMLDivElement>(null)
  const stepMax = guide.steps.length - 1

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
    <Page
      key="guide"
      title={guide.name}
      pageTitleTextClassName="leading-5 line-clamp-1"
      backButton={<BackButtonLink to="/guides" search={{ path: '' }} />}
    >
      <PageScrollableContent hasTitleBar ref={scrollableRef}>
        <header className="fixed inset-x-0 top-[60px] z-10 bg-primary-800 sm:top-[66px]">
          <div className="relative flex h-9 items-center justify-between gap-2 p-1">
            {step && (
              <>
                {step.map !== null && step.map.toLowerCase() !== 'nomap' && (
                  <Position pos_x={step.pos_x} pos_y={step.pos_y} />
                )}
                <ChangeStep
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
            stepIndex={index}
          />
        )}
      </PageScrollableContent>
    </Page>
  )
}
