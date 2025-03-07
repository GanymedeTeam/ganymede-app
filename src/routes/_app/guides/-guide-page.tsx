import { ChangeStep } from '@/components/change-step.tsx'
import { GuideFrame } from '@/components/guide-frame.tsx'
import { PageScrollableContent } from '@/components/page-scrollable-content.tsx'
import { Position } from '@/components/position.tsx'
import { useGuide } from '@/hooks/use_guide.ts'
import { useScrollToTop } from '@/hooks/use_scroll_to_top.ts'
import { cn } from '@/lib/utils.ts'
import { useSetConf } from '@/mutations/set-conf.mutation.ts'
import { confQuery } from '@/queries/conf.query.ts'
import { useSuspenseQuery } from '@tanstack/react-query'
import { useNavigate } from '@tanstack/react-router'
import { useRef } from 'react'
import { ReportButton } from './-report-button.tsx'

export function GuidePage({
  id,
  stepIndex: index,
}: {
  id: number
  stepIndex: number
}) {
  const guide = useGuide(id)
  const step = guide.steps[index]
  const stepMax = guide.steps.length - 1
  const scrollableRef = useRef<HTMLDivElement>(null)
  const conf = useSuspenseQuery(confQuery)
  const setConf = useSetConf()
  const navigate = useNavigate()

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
      to: '/guides/$id',
      params: {
        id: guide.id,
      },
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
              <div className="ml-auto flex">
                <ReportButton guideId={guide.id} stepIndex={index} />
              </div>
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
  )
}
