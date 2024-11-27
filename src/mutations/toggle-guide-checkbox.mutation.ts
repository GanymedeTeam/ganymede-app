import { toggleGuideCheckbox } from '@/ipc/guides.ts'
import { getProfile } from '@/lib/profile'
import { getProgress, getStep, newProgress } from '@/lib/progress'
import { confQuery } from '@/queries/conf.query'
import { useMutation, useQueryClient } from '@tanstack/react-query'

export function useToggleGuideCheckbox() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({
      guideId,
      checkboxIndex,
      stepIndex,
    }: {
      guideId: number
      checkboxIndex: number
      stepIndex: number
    }) => {
      const result = await toggleGuideCheckbox(guideId, checkboxIndex, stepIndex)

      if (result.isErr()) {
        throw result.error
      }
    },
    onMutate({ guideId, checkboxIndex, stepIndex }) {
      const conf = queryClient.getQueryData(confQuery['queryKey'])!
      const baseConf = { ...conf }

      const profile = getProfile(conf)
      const progress = getProgress(profile, guideId) ?? newProgress(guideId)

      const step = getStep(progress, stepIndex) ?? { checkboxes: [] }

      const checkbox = step.checkboxes.find((i) => i === checkboxIndex)

      if (checkbox === undefined) {
        step.checkboxes.push(checkboxIndex)
      } else {
        step.checkboxes = step.checkboxes.filter((i) => {
          return i !== checkbox
        })
      }

      progress.steps[stepIndex] = step

      const progressInProfile = profile.progresses.find((p) => p.id === guideId)

      if (progressInProfile === undefined) {
        profile.progresses.push(progress)
      } else {
        profile.progresses = profile.progresses.map((p) => {
          if (p.id === guideId) {
            p = progress
          }

          return p
        })
      }

      conf.profiles = conf.profiles.map((p) => {
        if (p.id === conf.profileInUse) {
          p = profile
        }

        return p
      })

      queryClient.setQueryData(confQuery['queryKey'], () => conf)

      return baseConf
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries(confQuery)
    },
    onError: (_err, _vars, context) => {
      queryClient.setQueryData(confQuery['queryKey'], context)
    },
  })
}
