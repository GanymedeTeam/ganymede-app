import { Trans } from '@lingui/react/macro'
import { Loader2Icon } from 'lucide-react'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert_dialog.tsx'
import { useDeepLinkGuideHandler } from '@/hooks/use_deep_link_guide_handler.ts'
import { useProfile } from '@/hooks/use_profile.ts'

export function DeepLinkGuideDownloadDialog() {
  const { dialogOpen, setDialogOpen, pendingGuideId, pendingStep, progressionStep, isDownloading, onDownloadConfirm } =
    useDeepLinkGuideHandler()
  const hasProgressionWarning = progressionStep !== null && pendingStep !== null
  const profile = useProfile()

  return (
    <AlertDialog
      open={dialogOpen}
      onOpenChange={(open) => {
        if (isDownloading) {
          setDialogOpen(true)

          return
        }

        setDialogOpen(open)
      }}
    >
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>
            {hasProgressionWarning ? <Trans>Attention</Trans> : <Trans>Télécharger le guide</Trans>}
          </AlertDialogTitle>
          <AlertDialogDescription>
            {hasProgressionWarning ? (
              <Trans>
                Le guide sera ouvert à <strong>l'étape {pendingStep + 1}</strong>. <br />
                Vous étiez à <strong>l'étape {progressionStep + 1}</strong> dans votre profil{' '}
                <strong>"{profile.name}"</strong>.
              </Trans>
            ) : (
              pendingGuideId !== null && (
                <Trans>
                  Le guide #{pendingGuideId} n'est pas téléchargé.
                  <br />
                  Voulez-vous le télécharger maintenant ?
                </Trans>
              )
            )}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={isDownloading}>
            <Trans>Annuler</Trans>
          </AlertDialogCancel>
          <AlertDialogAction disabled={isDownloading} onClick={onDownloadConfirm}>
            {isDownloading && <Loader2Icon className="animate-spin" />}
            {isDownloading ? (
              <Trans>Téléchargement...</Trans>
            ) : hasProgressionWarning ? (
              <Trans>Continuer</Trans>
            ) : (
              <Trans>Télécharger</Trans>
            )}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
