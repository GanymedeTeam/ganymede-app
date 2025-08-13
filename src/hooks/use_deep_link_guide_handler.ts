import { useLingui } from '@lingui/react/macro'
import { useNavigate } from '@tanstack/react-router'
import { info } from '@tauri-apps/plugin-log'
import { useCallback, useEffect, useState } from 'react'
import { toast } from 'sonner'
import { OpenGuideStep } from '@/ipc/bindings.ts'
import { onOpenGuideRequest } from '@/ipc/deep_link.ts'
import { guideExists } from '@/ipc/guides.ts'
import { useDownloadGuideFromServer } from '@/mutations/download_guide_from_server.mutation.ts'

export function useDeepLinkGuideHandler() {
  const navigate = useNavigate()
  const [dialogOpen, setDialogOpen] = useState(false)
  const [pendingGuideId, setPendingGuideId] = useState<number | null>(null)
  const [pendingStep, setPendingStep] = useState<number | null>(null)
  const [progressionStep, setProgressionStep] = useState<number | null>(null)
  const downloadGuideFromServer = useDownloadGuideFromServer()
  const { t } = useLingui()

  const navigateToGuide = useCallback(
    (guideId: number, step: number) => {
      info(`Navigating to guide ${guideId}, step ${step}`)
      navigate({
        to: '/guides/$id',
        params: {
          id: guideId,
        },
        search: {
          step,
        },
      })

      // Reset state
      setDialogOpen(false)

      setTimeout(() => {
        setPendingGuideId(null)
        setPendingStep(null)
        setProgressionStep(null)
      }, 500)
    },
    [navigate],
  )

  const handleDeepLink = useCallback(
    async (guideId: number, step: OpenGuideStep) => {
      try {
        info(`Deep link handler: checking if guide ${guideId} exists`)

        // Check if guide exists locally
        const existsResult = await guideExists(guideId)

        if (existsResult.isErr()) {
          throw existsResult.error
        }

        if (existsResult.value) {
          if (step.progressionStep !== null && step.step !== step.progressionStep) {
            // Guide exists but the step is different from the progression step, show download dialog
            setDialogOpen(true)
            setPendingGuideId(guideId)
            setPendingStep(step.step)
            setProgressionStep(step.progressionStep)
          } else {
            // Guide exists, navigate directly
            navigateToGuide(guideId, step.step)
          }
        } else {
          // Guide doesn't exist, show download dialog
          setDialogOpen(true)
          setPendingGuideId(guideId)
          setPendingStep(step.step)
          setProgressionStep(step.progressionStep)
        }
      } catch (error) {
        console.error('Failed to check guide existence:', error)
        toast.error(t`Erreur lors de la vérification du guide`)
      }
    },
    [navigateToGuide, t],
  )

  const handleDownloadConfirm = useCallback(async () => {
    if (!pendingGuideId) return

    try {
      await downloadGuideFromServer.mutateAsync({
        guide: { id: pendingGuideId },
        folder: '',
      })

      if (pendingStep === null || progressionStep === null) {
        toast.success(t`Guide téléchargé avec succès`)
      }

      // Navigate to guide after successful download
      navigateToGuide(pendingGuideId, pendingStep ?? progressionStep ?? 0)
    } catch (error) {
      console.error('Failed to download guide:', error)
      toast.error(t`Erreur lors du téléchargement du guide`)
    }
  }, [pendingGuideId, pendingStep, progressionStep, navigateToGuide, t, downloadGuideFromServer.mutateAsync])

  useEffect(() => {
    const unlisten = onOpenGuideRequest(handleDeepLink)

    return () => {
      unlisten.then((cb) => cb())
    }
  }, [handleDeepLink])

  return {
    dialogOpen,
    setDialogOpen,
    pendingGuideId,
    pendingStep,
    progressionStep,
    isDownloading: downloadGuideFromServer.isPending,
    onDownloadConfirm: handleDownloadConfirm,
  }
}
