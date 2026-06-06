import { useLingui } from '@lingui/react/macro'
import { useSuspenseQuery } from '@tanstack/react-query'
import { TrashIcon } from 'lucide-react'
import { useEffect, useRef } from 'react'
import { toast } from 'sonner'

import { Button } from '@/components/ui/button.tsx'
import { getStepNote } from '@/lib/step_notes.ts'
import { useSetStepNote } from '@/mutations/set_step_note.mutation.ts'
import { confQuery } from '@/queries/conf.query.ts'
import { stepNotesQuery } from '@/queries/step_notes.query.ts'

const REMINDER_THROTTLE_MS = 1000

export function useStepNoteReminder(guideId: number, stepIndex: number) {
  const { t } = useLingui()
  const conf = useSuspenseQuery(confQuery)
  const stepNotes = useSuspenseQuery(stepNotesQuery)
  const setStepNote = useSetStepNote()

  const latest = useRef({
    guideId,
    stepIndex,
    notes: stepNotes.data,
    profileId: conf.data.profileInUse,
    setStepNote,
    t,
  })
  latest.current = {
    guideId,
    stepIndex,
    notes: stepNotes.data,
    profileId: conf.data.profileInUse,
    setStepNote,
    t,
  }

  const lastShownRef = useRef(0)
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    const show = () => {
      lastShownRef.current = Date.now()

      const { guideId, stepIndex, notes, profileId, setStepNote, t } = latest.current
      const note = getStepNote(notes, profileId, guideId, stepIndex)

      if (!note?.is_reminder || note.content.trim() === '') return

      const toastId = `reminder-${guideId}-${stepIndex}`

      toast(note.content, {
        id: toastId,
        duration: Infinity,
        action: (
          <Button
            className="ml-auto shrink-0"
            onClick={() => {
              setStepNote.mutate({ profileId, guideId, stepIndex, note: null, isReminder: false })
              toast.dismiss(toastId)
            }}
            size="sm"
            variant="destructive"
          >
            <TrashIcon />
            {t`Supprimer`}
          </Button>
        ),
      })
    }

    const elapsed = Date.now() - lastShownRef.current

    // Throttle: show immediately when the window has elapsed, otherwise schedule a single
    // trailing call so fast next/previous navigation does not spam toasts.
    if (elapsed >= REMINDER_THROTTLE_MS) {
      show()
    } else if (timerRef.current === null) {
      timerRef.current = setTimeout(() => {
        timerRef.current = null
        show()
      }, REMINDER_THROTTLE_MS - elapsed)
    }
  }, [guideId, stepIndex])

  useEffect(() => {
    return () => {
      if (timerRef.current !== null) clearTimeout(timerRef.current)
    }
  }, [])
}
