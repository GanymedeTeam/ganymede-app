import { useMutation, useQueryClient } from '@tanstack/react-query'
import { StepNotes } from '@/ipc/bindings.ts'
import { setStepNote } from '@/ipc/step_notes.ts'
import { stepNotesQuery } from '@/queries/step_notes.query.ts'

const MAX_NOTE_LEN = 1000

export function useSetStepNote() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({
      profileId,
      guideId,
      stepIndex,
      note,
    }: {
      profileId: string
      guideId: number
      stepIndex: number
      note: string | null
    }) => {
      const result = await setStepNote(profileId, guideId, stepIndex, note)

      if (result.isErr()) {
        throw result.error
      }
    },
    onMutate({ profileId, guideId, stepIndex, note }) {
      const previous = queryClient.getQueryData(stepNotesQuery.queryKey)
      const base: StepNotes = previous ?? { profiles: {} }

      const trimmed = note?.trim() ?? ''
      const next: StepNotes = { profiles: { ...base.profiles } }

      const profileEntry = {
        guides: { ...(next.profiles[profileId]?.guides ?? {}) },
      }
      const guideEntry = {
        steps: { ...(profileEntry.guides[guideId]?.steps ?? {}) },
      }

      if (trimmed === '') {
        delete guideEntry.steps[stepIndex]
      } else {
        guideEntry.steps[stepIndex] = trimmed.slice(0, MAX_NOTE_LEN)
      }

      if (Object.keys(guideEntry.steps).length === 0) {
        delete profileEntry.guides[guideId]
      } else {
        profileEntry.guides[guideId] = guideEntry
      }

      if (Object.keys(profileEntry.guides).length === 0) {
        delete next.profiles[profileId]
      } else {
        next.profiles[profileId] = profileEntry
      }

      queryClient.setQueryData(stepNotesQuery.queryKey, next)

      return previous
    },
    onError(_err, _vars, context) {
      queryClient.setQueryData(stepNotesQuery.queryKey, context)
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries(stepNotesQuery)
    },
  })
}
