import { useLingui } from '@lingui/react/macro'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useEffect } from 'react'
import { toast } from 'sonner'

import { deleteCorruptedGuides } from '@/ipc/guides.ts'
import { corruptedGuidesQuery } from '@/queries/corrupted_guides.query.ts'

const TOAST_ID = 'malformed-guides'

export function useMalformedGuidesHandler() {
  const { t } = useLingui()
  const queryClient = useQueryClient()
  const { data } = useQuery(corruptedGuidesQuery())

  useEffect(() => {
    const files = data ?? []

    if (files.length === 0) {
      toast.dismiss(TOAST_ID)
      return
    }

    const labels = files.map((file) => (file.id !== null ? `#${file.id}` : file.file_name)).join(', ')

    toast.warning(t`Guides corrompus détectés : ${labels}`, {
      id: TOAST_ID,
      duration: Number.POSITIVE_INFINITY,
      action: {
        label: t`Supprimer`,
        onClick: async (e) => {
          e.preventDefault()

          const result = await deleteCorruptedGuides()

          if (result.isErr()) {
            toast.error(t`La suppression des guides corrompus a échoué.`, { duration: 4000 })
            return
          }

          toast.dismiss(TOAST_ID)
          toast.success(t`Guides corrompus supprimés.`)
          await queryClient.invalidateQueries({ queryKey: corruptedGuidesQuery().queryKey })
        },
      },
    })
  }, [data, t, queryClient])
}
