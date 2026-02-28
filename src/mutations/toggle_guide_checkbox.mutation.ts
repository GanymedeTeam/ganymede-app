import { useMutation, useQueryClient } from '@tanstack/react-query'
import { toggleGuideCheckbox } from '@/ipc/conf.ts'
import { getProfile } from '@/lib/profile.ts'
import { getProgress, getStep, newProgress } from '@/lib/progress.ts'
import { queueProgressSync } from '@/lib/sync_progress_queue.ts'
import { confQuery } from '@/queries/conf.query.ts'

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
      guideName?: string
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
    onSuccess: async (_data, { guideId, guideName }) => {
      await queryClient.invalidateQueries(confQuery)

      const conf = queryClient.getQueryData(confQuery.queryKey)
      if (conf) {
        const profile = getProfile(conf)
        const progress = getProgress(profile, guideId)
        if (progress) {
          queueProgressSync(profile.server_id, guideId, progress.currentStep, progress.steps, guideName)
        }
      }
    },
    onError: (_err, _vars, context) => {
      queryClient.setQueryData(confQuery['queryKey'], context)
    },
  })
}
