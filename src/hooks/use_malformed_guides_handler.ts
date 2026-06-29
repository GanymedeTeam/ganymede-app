import { useLingui } from '@lingui/react/macro'
import { useEffect } from 'react'
import { toast } from 'sonner'

import { onMalformedGuidesRemoved } from '@/ipc/guides.ts'

export function useMalformedGuidesHandler() {
  const { t } = useLingui()

  useEffect(() => {
    const unlisten = onMalformedGuidesRemoved((files) => {
      if (files.length === 0) return

      const labels = files.map((file) => (file.id !== null ? `#${file.id}` : file.file_name)).join(', ')

      toast.warning(t`Guides corrompus supprimés : ${labels}`)
    })

    return () => {
      unlisten.then((cb) => cb())
    }
  }, [t])
}
