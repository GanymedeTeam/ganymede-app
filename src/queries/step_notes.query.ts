import { queryOptions } from '@tanstack/react-query'
import { StepNotes } from '@/ipc/bindings.ts'
import { GetStepNotesError, getStepNotes } from '@/ipc/step_notes.ts'

export const stepNotesQuery = queryOptions<StepNotes, GetStepNotesError>({
  queryKey: ['step_notes'],
  queryFn: async () => {
    const notes = await getStepNotes()

    if (notes.isErr()) {
      throw notes.error
    }

    return notes.value
  },
})
