import { useLingui } from '@lingui/react/macro'
import { useQuery, useSuspenseQuery } from '@tanstack/react-query'
import { createFileRoute } from '@tanstack/react-router'
import { AlmanaxCard } from '@/components/almanax_card.tsx'
import { HomeFooter } from '@/components/home_footer.tsx'
import { PageScrollableContent } from '@/components/page_scrollable_content.tsx'
import { PageTitleExtra } from '@/components/page_title.tsx'
import { WelcomeCard } from '@/components/welcome_card.tsx'
import { isProductionQuery } from '@/queries/is_production.query.ts'
import { versionQuery } from '@/queries/version.query.ts'
import { Page } from '@/routes/-page.tsx'

export const Route = createFileRoute('/_app/')({
  beforeLoad: async ({ context: { queryClient } }) => {
    // Preload data to avoid suspend/flicker on navigation
    await queryClient.ensureQueryData(isProductionQuery)
  },
  component: Index,
})

function Index() {
  const version = useQuery(versionQuery)
  const { t } = useLingui()
  const isProduction = useSuspenseQuery(isProductionQuery)

  return (
    <Page
      title={t`Présentation`}
      actions={
        <PageTitleExtra className="grow text-right" hidden={!version.isSuccess}>
          v{version.data}
          {!isProduction.data && '-dev'}
        </PageTitleExtra>
      }
    >
      <PageScrollableContent className="p-2">
        <div className="app-bg flex grow flex-col gap-3">
          <WelcomeCard />
          <AlmanaxCard />
          <HomeFooter />
        </div>
      </PageScrollableContent>
    </Page>
  )
}
