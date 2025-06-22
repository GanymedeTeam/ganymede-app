import { useSuspenseQuery } from '@tanstack/react-query'
import { createFileRoute, Link, redirect } from '@tanstack/react-router'
import { PlusIcon } from 'lucide-react'
import { z } from 'zod'
import { PageContent } from '@/components/page_content.tsx'
import { PageTitle, PageTitleText } from '@/components/page_title.tsx'
import { Button } from '@/components/ui/button.tsx'
import { Tabs, TabsContent, TabsList } from '@/components/ui/tabs.tsx'
import { useProfile } from '@/hooks/use_profile.ts'
import { useTabs } from '@/hooks/use_tabs.ts'
import { getGuideById, getStepClamped } from '@/lib/guide.ts'
import { getProgress } from '@/lib/progress.ts'
import { guidesQuery } from '@/queries/guides.query.ts'
import { GuidePage } from './-guide_page.tsx'
import { GuideTabsTrigger } from './-guide_tabs_trigger.tsx'

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

    const { addOrReplaceTab } = useTabs.getState()

    addOrReplaceTab(guideById.id)
  },
})

function Pending() {
  return (
    <PageContent key="guide">
      <PageTitle>
        <div className="flex w-full items-center gap-2" data-slot="page-title-content">
          <PageTitleText></PageTitleText>
        </div>
      </PageTitle>
    </PageContent>
  )
}

function GuideIdPage() {
  const params = Route.useParams()
  const search = Route.useSearch()
  const tabs = useTabs((s) => s.tabs)
  const navigate = Route.useNavigate()
  const profile = useProfile()
  const guides = useSuspenseQuery(guidesQuery())

  return (
    <PageContent key={`guide-step-${search.step}`}>
      <Tabs
        value={params.id.toString()}
        onValueChange={(newTab) => {
          navigate({
            to: '/guides/$id',
            params: {
              id: Number(newTab),
            },
            search: {
              step: getProgress(profile, Number(newTab))?.currentStep ?? 0,
            },
          })
        }}
      >
        <TabsList className="group" data-multiple={tabs.length > 1 ? 'true' : 'false'}>
          {tabs.map((guideId) => (
            <GuideTabsTrigger key={guideId} id={guideId} currentId={params.id} />
          ))}
          <Button size="icon" className="min-h-6 min-w-6 self-center sm:size-6" variant="secondary" asChild>
            <Link
              to="/guides"
              search={{
                path: '',
                from: params.id,
              }}
              draggable={false}
            >
              <PlusIcon />
            </Link>
          </Button>
        </TabsList>
        {tabs.map((guide) => (
          <TabsContent key={`guide-${guide}-${search.step}`} value={guide.toString()}>
            <GuidePage id={guide} stepIndex={getStepClamped(guides.data, params.id, search.step)} />
          </TabsContent>
        ))}
      </Tabs>
    </PageContent>
  )
}
