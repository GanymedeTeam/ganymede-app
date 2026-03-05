import { useLingui } from '@lingui/react/macro'
import { useQueryClient } from '@tanstack/react-query'
import { useNavigate } from '@tanstack/react-router'
import { useCallback } from 'react'
import { toast } from 'sonner'
import { useTabs } from '@/hooks/use_tabs.ts'
import type { Conf } from '@/ipc/bindings.ts'
import { getProfileById } from '@/lib/profile.ts'
import { getProgress } from '@/lib/progress.ts'
import { recentGuidesQuery } from '@/queries/recent_guides.query.ts'

export function useSwitchProfile() {
  const queryClient = useQueryClient()
  const navigate = useNavigate()
  const setTabs = useTabs((s) => s.setTabs)
  const { t } = useLingui()

  return useCallback(
    async (newConf: Conf, newProfileId: string) => {
      const newProfile = getProfileById(newConf.profiles, newProfileId)
      if (!newProfile) return

      toast.info(t`Profil "${newProfile.name}" chargé`)

      const recentGuides = await queryClient.fetchQuery(recentGuidesQuery(newProfileId))

      setTabs(recentGuides)

      if (recentGuides.length === 0) {
        navigate({ to: '/guides', search: { path: '' } })
        return
      }

      const firstGuide = recentGuides[0]
      const progress = getProgress(newProfile, firstGuide)

      navigate({
        to: '/guides/$id',
        params: { id: firstGuide },
        search: { step: progress?.currentStep ?? 0 },
      })
    },
    [queryClient, navigate, setTabs, t],
  )
}
