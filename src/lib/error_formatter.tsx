import { t } from '@lingui/core/macro'
import { ReactNode } from 'react'
import type {
  AlmanaxError,
  AppVersionError,
  ConfError,
  GuidesError,
  ImageError,
  JsonError,
  NotificationsError,
  OAuthError,
  QuestError,
  ReportError,
  UpdateError,
  UserError,
} from '@/ipc/bindings.ts'

interface FormattedError {
  type: string
  message: string
  details?: string
}

export function formatTauRPCError(error: unknown): FormattedError {
  // Cas spécial pour les erreurs utilisateur qui peuvent être des strings
  if (error === 'TokensNotFound' || error === 'NotConnected') {
    return formatUserError(error as UserError)
  }

  if (typeof error !== 'object' || error === null) {
    return {
      type: t`Erreur inconnue`,
      message: String(error),
    }
  }

  const errorObj = error as Record<string, unknown>

  // Détecter et formater les erreurs spécifiques
  if (isConfError(error)) {
    return formatConfError(error as ConfError)
  }

  if (isJsonError(errorObj)) {
    return formatJsonError(error as JsonError)
  }

  if (isGuidesError(errorObj)) {
    return formatGuidesError(error as GuidesError)
  }

  if (isOAuthError(errorObj)) {
    return formatOAuthError(error as OAuthError)
  }

  if (isUserError(error)) {
    return formatUserError(error as UserError)
  }

  if (isNotificationsError(errorObj)) {
    return formatNotificationsError(error as NotificationsError)
  }

  if (isReportError(errorObj)) {
    return formatReportError(error as ReportError)
  }

  if (isAlmanaxError(errorObj)) {
    return formatAlmanaxError(error as AlmanaxError)
  }

  if (isQuestError(errorObj)) {
    return formatQuestError(error as QuestError)
  }

  if (isUpdateError(errorObj)) {
    return formatUpdateError(error as UpdateError)
  }

  if (isImageError(errorObj)) {
    return formatImageError(error as ImageError)
  }

  if (isAppVersionError(errorObj)) {
    return formatAppVersionError(error as AppVersionError)
  }

  // Si aucun formateur ne fonctionne, affichage générique
  return {
    type: t`Erreur système`,
    message: t`Une erreur inattendue s'est produite`,
    details: JSON.stringify(error, null, 2),
  }
}

// Type guards
function isConfError(error: unknown): boolean {
  return (
    error === 'GetProfileInUse' ||
    (typeof error === 'object' &&
      error !== null &&
      ('Malformed' in error ||
        'CreateConfDir' in error ||
        'ConfDir' in error ||
        'SerializeConf' in error ||
        'SaveConf' in error ||
        'UnhandledIo' in error ||
        'ResetConf' in error))
  )
}

function isJsonError(error: Record<string, unknown>): boolean {
  return 'Json' in error || 'Serialize' in error
}

function isGuidesError(error: Record<string, unknown>): boolean {
  return (
    'Pattern' in error ||
    'ReadGuidesDirGlob' in error ||
    'ReadGuidesDir' in error ||
    'ReadGuideFile' in error ||
    'ReadRecentGuidesFile' in error ||
    'GuideMalformed' in error ||
    'RecentGuidesFileMalformed' in error ||
    'SerializeGuide' in error ||
    'SerializeRecentGuidesFile' in error ||
    'CreateGuidesDir' in error ||
    'WriteGuideFile' in error ||
    'WriteRecentGuidesFile' in error ||
    'RequestGuide' in error ||
    'RequestGuideContent' in error ||
    'RequestGuides' in error ||
    'RequestGuidesContent' in error ||
    'GuideWithStepsMalformed' in error ||
    'GuidesMalformed' in error ||
    'GetGuideInSystem' in error ||
    'DeleteGuideFileInSystem' in error ||
    'DeleteGuideFolderInSystem' in error ||
    'Opener' in error
  )
}

function isOAuthError(error: Record<string, unknown>): boolean {
  return (
    'OpenBrowser' in error ||
    'SaveAuth' in error ||
    'TokenExchange' in error ||
    'LoadAuth' in error ||
    'CleanAuth' in error ||
    'Json' in error ||
    'InvalidTokenResponse' in error
  )
}

function isUserError(error: unknown): boolean {
  return (
    error === 'TokensNotFound' ||
    error === 'NotConnected' ||
    (typeof error === 'object' && error !== null && ('FailedToGetUser' in error || 'InvalidUserResponse' in error))
  )
}

function isNotificationsError(error: Record<string, unknown>): boolean {
  return (
    'FetchNotifications' in error ||
    'ParseApiResponse' in error ||
    'Malformed' in error ||
    'SerializeViewedNotifications' in error
  )
}

function isReportError(error: Record<string, unknown>): boolean {
  return 'Server' in error || 'Status' in error
}

function isAlmanaxError(error: Record<string, unknown>): boolean {
  return (
    'DofusDbAlmanaxMalformed' in error ||
    'DofusDbItemMalformed' in error ||
    'RequestAlmanax' in error ||
    'RequestAlmanaxContent' in error ||
    'RequestItem' in error ||
    'RequestItemContent' in error ||
    'Conf' in error ||
    'Quest' in error
  )
}

function isQuestError(error: Record<string, unknown>): boolean {
  return 'RequestQuest' in error || 'RequestQuestContent' in error || 'DofusDbQuestMalformed' in error
}

function isUpdateError(error: Record<string, unknown>): boolean {
  return 'CheckUpdateError' in error || 'GetUpdaterError' in error
}

function isImageError(error: Record<string, unknown>): boolean {
  return 'RequestImage' in error || 'ConvertToBytes' in error
}

function isAppVersionError(error: Record<string, unknown>): boolean {
  return 'GitHub' in error || 'JsonMalformed' in error || 'SemverParse' in error
}

function formatConfError(error: ConfError): FormattedError {
  if (typeof error === 'object' && error !== null) {
    if ('Malformed' in error) {
      const jsonError = formatJsonError(error.Malformed)
      return {
        type: t`Erreur de configuration`,
        message: t`Fichier de configuration malformé`,
        details: jsonError.message + (jsonError.details ? `\n${jsonError.details}` : ''),
      }
    }

    if ('CreateConfDir' in error) {
      return {
        type: t`Erreur de configuration`,
        message: t`Impossible de créer le dossier de configuration`,
        details: error.CreateConfDir,
      }
    }

    if ('ConfDir' in error) {
      return {
        type: t`Erreur de configuration`,
        message: t`Impossible d'accéder au dossier de configuration`,
        details: error.ConfDir,
      }
    }

    if ('SerializeConf' in error) {
      const jsonError = formatJsonError(error.SerializeConf)
      return {
        type: t`Erreur de configuration`,
        message: t`Impossible de sauvegarder la configuration`,
        details: jsonError.message + (jsonError.details ? `\n${jsonError.details}` : ''),
      }
    }

    if ('SaveConf' in error) {
      return {
        type: t`Erreur de configuration`,
        message: t`Impossible de sauvegarder la configuration`,
        details: error.SaveConf,
      }
    }

    if ('ResetConf' in error) {
      const nestedError = formatConfError(error.ResetConf)
      return {
        type: t`Erreur de configuration`,
        message: t`Impossible de réinitialiser la configuration`,
        details: nestedError.message + (nestedError.details ? `\n${nestedError.details}` : ''),
      }
    }
  }

  if (error === 'GetProfileInUse') {
    return {
      type: t`Erreur de configuration`,
      message: t`Impossible de récupérer le profil actuel`,
    }
  }

  return {
    type: t`Erreur de configuration`,
    message: t`Erreur de configuration inconnue`,
    details: JSON.stringify(error, null, 2),
  }
}

function formatJsonError(error: JsonError): FormattedError {
  if ('Json' in error) {
    const message = error.Json

    // Essayer d'extraire les informations utiles des erreurs JSON
    if (message.includes('missing field')) {
      const match = message.match(/missing field `([^`]+)`/)
      if (match) {
        return {
          type: t`Erreur JSON`,
          message: t`Champ manquant : ${match[1]}`,
          details: message,
        }
      }
    }

    if (message.includes('unknown field')) {
      const match = message.match(/unknown field `([^`]+)`/)
      if (match) {
        return {
          type: t`Erreur JSON`,
          message: t`Champ inconnu : ${match[1]}`,
          details: message,
        }
      }
    }

    if (message.includes('expected')) {
      return {
        type: t`Erreur JSON`,
        message: t`Format de données incorrect`,
        details: message,
      }
    }

    return {
      type: t`Erreur JSON`,
      message: t`Erreur de format JSON`,
      details: message,
    }
  }

  if ('Serialize' in error) {
    return {
      type: t`Erreur JSON`,
      message: t`Impossible de sérialiser les données`,
      details: error.Serialize,
    }
  }

  return {
    type: t`Erreur JSON`,
    message: t`Erreur JSON inconnue`,
    details: JSON.stringify(error, null, 2),
  }
}

function formatGuidesError(error: GuidesError): FormattedError {
  if ('ReadGuidesDirGlob' in error) {
    return {
      type: t`Erreur de guides`,
      message: t`Impossible de lire le dossier des guides (glob)`,
      details: error.ReadGuidesDirGlob,
    }
  }

  if ('ReadGuidesDir' in error) {
    return {
      type: t`Erreur de guides`,
      message: t`Impossible de lire le dossier des guides`,
      details: error.ReadGuidesDir,
    }
  }

  if ('ReadGuideFile' in error) {
    return {
      type: t`Erreur de guides`,
      message: t`Impossible de lire le fichier guide`,
      details: error.ReadGuideFile,
    }
  }

  if ('ReadRecentGuidesFile' in error) {
    return {
      type: t`Erreur de guides`,
      message: t`Impossible de lire le fichier des guides récents`,
      details: error.ReadRecentGuidesFile,
    }
  }

  if ('GuideMalformed' in error) {
    const jsonError = formatJsonError(error.GuideMalformed)
    return {
      type: t`Erreur de guides`,
      message: t`Guide malformé`,
      details: jsonError.message + (jsonError.details ? `\n${jsonError.details}` : ''),
    }
  }

  if ('RecentGuidesFileMalformed' in error) {
    return {
      type: t`Erreur de guides`,
      message: t`Fichier des guides récents malformé`,
      details: error.RecentGuidesFileMalformed,
    }
  }

  if ('SerializeGuide' in error) {
    const jsonError = formatJsonError(error.SerializeGuide)
    return {
      type: t`Erreur de guides`,
      message: t`Impossible de sérialiser le guide`,
      details: jsonError.message + (jsonError.details ? `\n${jsonError.details}` : ''),
    }
  }

  if ('SerializeRecentGuidesFile' in error) {
    const jsonError = formatJsonError(error.SerializeRecentGuidesFile)
    return {
      type: t`Erreur de guides`,
      message: t`Impossible de sérialiser le fichier des guides récents`,
      details: jsonError.message + (jsonError.details ? `\n${jsonError.details}` : ''),
    }
  }

  if ('CreateGuidesDir' in error) {
    return {
      type: t`Erreur de guides`,
      message: t`Impossible de créer le dossier des guides`,
      details: error.CreateGuidesDir,
    }
  }

  if ('WriteGuideFile' in error) {
    return {
      type: t`Erreur de guides`,
      message: t`Impossible de sauvegarder le guide`,
      details: error.WriteGuideFile,
    }
  }

  if ('WriteRecentGuidesFile' in error) {
    return {
      type: t`Erreur de guides`,
      message: t`Impossible de sauvegarder le fichier des guides récents`,
      details: error.WriteRecentGuidesFile,
    }
  }

  if ('RequestGuide' in error) {
    return {
      type: t`Erreur de guides`,
      message: t`Impossible de télécharger le guide`,
      details: error.RequestGuide,
    }
  }

  if ('RequestGuideContent' in error) {
    return {
      type: t`Erreur de guides`,
      message: t`Contenu du guide invalide`,
      details: error.RequestGuideContent,
    }
  }

  if ('RequestGuides' in error) {
    return {
      type: t`Erreur de guides`,
      message: t`Impossible de récupérer la liste des guides`,
      details: error.RequestGuides,
    }
  }

  if ('RequestGuidesContent' in error) {
    return {
      type: t`Erreur de guides`,
      message: t`Contenu de la liste des guides invalide`,
      details: error.RequestGuidesContent,
    }
  }

  if ('GuideWithStepsMalformed' in error) {
    const jsonError = formatJsonError(error.GuideWithStepsMalformed)
    return {
      type: t`Erreur de guides`,
      message: t`Guide avec étapes malformé`,
      details: jsonError.message + (jsonError.details ? `\n${jsonError.details}` : ''),
    }
  }

  if ('GuidesMalformed' in error) {
    const jsonError = formatJsonError(error.GuidesMalformed)
    return {
      type: t`Erreur de guides`,
      message: t`Liste des guides malformée`,
      details: jsonError.message + (jsonError.details ? `\n${jsonError.details}` : ''),
    }
  }

  if ('GetGuideInSystem' in error) {
    return {
      type: t`Erreur de guides`,
      message: t`Guide introuvable dans le système`,
      details: `ID du guide: ${error.GetGuideInSystem}`,
    }
  }

  if ('DeleteGuideFileInSystem' in error) {
    return {
      type: t`Erreur de guides`,
      message: t`Impossible de supprimer le fichier guide`,
      details: error.DeleteGuideFileInSystem,
    }
  }

  if ('DeleteGuideFolderInSystem' in error) {
    return {
      type: t`Erreur de guides`,
      message: t`Impossible de supprimer le dossier guide`,
      details: error.DeleteGuideFolderInSystem,
    }
  }

  if ('Opener' in error) {
    return {
      type: t`Erreur de guides`,
      message: t`Impossible d'ouvrir le dossier`,
      details: error.Opener,
    }
  }

  if ('Pattern' in error) {
    return {
      type: t`Erreur de guides`,
      message: t`Motif de recherche invalide`,
      details: error.Pattern,
    }
  }

  return {
    type: t`Erreur de guides`,
    message: t`Erreur de guides inconnue`,
    details: JSON.stringify(error, null, 2),
  }
}

function formatOAuthError(error: OAuthError): FormattedError {
  if ('OpenBrowser' in error) {
    return {
      type: t`Erreur d'authentification`,
      message: t`Impossible d'ouvrir le navigateur`,
      details: error.OpenBrowser,
    }
  }

  if ('SaveAuth' in error) {
    return {
      type: t`Erreur d'authentification`,
      message: t`Impossible de sauvegarder l'authentification`,
      details: error.SaveAuth,
    }
  }

  if ('LoadAuth' in error) {
    return {
      type: t`Erreur d'authentification`,
      message: t`Impossible de charger l'authentification`,
      details: error.LoadAuth,
    }
  }

  if ('CleanAuth' in error) {
    return {
      type: t`Erreur d'authentification`,
      message: t`Impossible de nettoyer l'authentification`,
      details: error.CleanAuth,
    }
  }

  if ('Json' in error) {
    return formatJsonError(error.Json)
  }

  if ('TokenExchange' in error) {
    return {
      type: t`Erreur d'authentification`,
      message: t`Échec de l'échange de tokens`,
      details: error.TokenExchange,
    }
  }

  if ('InvalidTokenResponse' in error) {
    return {
      type: t`Erreur d'authentification`,
      message: t`Réponse de token invalide`,
      details: error.InvalidTokenResponse,
    }
  }

  return {
    type: t`Erreur d'authentification`,
    message: t`Erreur d'authentification inconnue`,
    details: JSON.stringify(error, null, 2),
  }
}

function formatUserError(error: UserError): FormattedError {
  if (error === 'TokensNotFound') {
    return {
      type: t`Erreur utilisateur`,
      message: t`Tokens d'authentification introuvables`,
    }
  }

  if (error === 'NotConnected') {
    return {
      type: t`Erreur utilisateur`,
      message: t`Utilisateur non connecté`,
    }
  }

  if ('FailedToGetUser' in error) {
    return {
      type: t`Erreur utilisateur`,
      message: t`Impossible de récupérer les informations utilisateur`,
      details: error.FailedToGetUser,
    }
  }

  return {
    type: t`Erreur utilisateur`,
    message: t`Erreur utilisateur inconnue`,
    details: JSON.stringify(error, null, 2),
  }
}

function formatNotificationsError(error: NotificationsError): FormattedError {
  if ('FetchNotifications' in error) {
    return {
      type: t`Erreur de notifications`,
      message: t`Impossible de récupérer les notifications`,
      details: error.FetchNotifications,
    }
  }

  if ('ParseApiResponse' in error) {
    return {
      type: t`Erreur de notifications`,
      message: t`Réponse API invalide`,
      details: error.ParseApiResponse,
    }
  }

  return {
    type: t`Erreur de notifications`,
    message: t`Erreur de notifications inconnue`,
    details: JSON.stringify(error, null, 2),
  }
}

function formatReportError(error: ReportError): FormattedError {
  if ('Server' in error) {
    return {
      type: t`Erreur de rapport`,
      message: t`Erreur serveur lors de l'envoi du rapport`,
      details: error.Server,
    }
  }

  if ('Status' in error) {
    const [code, message] = error.Status
    return {
      type: t`Erreur de rapport`,
      message: t`Erreur HTTP ${code}`,
      details: message,
    }
  }

  return {
    type: t`Erreur de rapport`,
    message: t`Erreur de rapport inconnue`,
    details: JSON.stringify(error, null, 2),
  }
}

function formatAlmanaxError(error: AlmanaxError): FormattedError {
  if (typeof error === 'object' && error !== null) {
    if ('DofusDbAlmanaxMalformed' in error) {
      const jsonError = formatJsonError(error.DofusDbAlmanaxMalformed)
      return {
        type: t`Erreur d'almanax`,
        message: t`Données d'almanax malformées`,
        details: jsonError.message + (jsonError.details ? `\n${jsonError.details}` : ''),
      }
    }

    if ('DofusDbItemMalformed' in error) {
      const jsonError = formatJsonError(error.DofusDbItemMalformed)
      return {
        type: t`Erreur d'almanax`,
        message: t`Données d'objet malformées`,
        details: jsonError.message + (jsonError.details ? `\n${jsonError.details}` : ''),
      }
    }

    if ('RequestAlmanax' in error) {
      return {
        type: t`Erreur d'almanax`,
        message: t`Impossible de récupérer l'almanax`,
        details: error.RequestAlmanax,
      }
    }

    if ('RequestAlmanaxContent' in error) {
      return {
        type: t`Erreur d'almanax`,
        message: t`Contenu de l'almanax invalide`,
        details: error.RequestAlmanaxContent,
      }
    }

    if ('RequestItem' in error) {
      return {
        type: t`Erreur d'almanax`,
        message: t`Impossible de récupérer l'objet`,
        details: error.RequestItem,
      }
    }

    if ('RequestItemContent' in error) {
      return {
        type: t`Erreur d'almanax`,
        message: t`Contenu de l'objet invalide`,
        details: error.RequestItemContent,
      }
    }

    if ('Conf' in error) {
      return formatConfError(error.Conf)
    }

    if ('Quest' in error) {
      return formatQuestError(error.Quest)
    }
  }

  return {
    type: t`Erreur d'almanax`,
    message: t`Erreur d'almanax inconnue`,
    details: JSON.stringify(error, null, 2),
  }
}

function formatQuestError(error: QuestError): FormattedError {
  if (typeof error === 'object' && error !== null) {
    if ('RequestQuest' in error) {
      return {
        type: t`Erreur de quête`,
        message: t`Impossible de récupérer la quête`,
        details: error.RequestQuest,
      }
    }

    if ('RequestQuestContent' in error) {
      return {
        type: t`Erreur de quête`,
        message: t`Contenu de la quête invalide`,
        details: error.RequestQuestContent,
      }
    }

    if ('DofusDbQuestMalformed' in error) {
      const jsonError = formatJsonError(error.DofusDbQuestMalformed)
      return {
        type: t`Erreur de quête`,
        message: t`Données de quête malformées`,
        details: jsonError.message + (jsonError.details ? `\n${jsonError.details}` : ''),
      }
    }
  }

  return {
    type: t`Erreur de quête`,
    message: t`Erreur de quête inconnue`,
    details: JSON.stringify(error, null, 2),
  }
}

function formatUpdateError(error: UpdateError): FormattedError {
  if (typeof error === 'object' && error !== null) {
    if ('CheckUpdateError' in error) {
      return {
        type: t`Erreur de mise à jour`,
        message: t`Impossible de vérifier les mises à jour`,
        details: error.CheckUpdateError,
      }
    }

    if ('GetUpdaterError' in error) {
      return {
        type: t`Erreur de mise à jour`,
        message: t`Impossible d'obtenir le système de mise à jour`,
        details: error.GetUpdaterError,
      }
    }
  }

  return {
    type: t`Erreur de mise à jour`,
    message: t`Erreur de mise à jour inconnue`,
    details: JSON.stringify(error, null, 2),
  }
}

function formatImageError(error: ImageError): FormattedError {
  if (typeof error === 'object' && error !== null) {
    if ('RequestImage' in error) {
      return {
        type: t`Erreur d'image`,
        message: t`Impossible de télécharger l'image`,
        details: error.RequestImage,
      }
    }

    if ('ConvertToBytes' in error) {
      return {
        type: t`Erreur d'image`,
        message: t`Impossible de convertir l'image`,
        details: error.ConvertToBytes,
      }
    }
  }

  return {
    type: t`Erreur d'image`,
    message: t`Erreur d'image inconnue`,
    details: JSON.stringify(error, null, 2),
  }
}

function formatAppVersionError(error: AppVersionError): FormattedError {
  if (typeof error === 'object' && error !== null) {
    if ('GitHub' in error) {
      return {
        type: t`Erreur de version`,
        message: t`Impossible de vérifier la version sur GitHub`,
        details: error.GitHub,
      }
    }

    if ('JsonMalformed' in error) {
      return {
        type: t`Erreur de version`,
        message: t`Réponse GitHub malformée`,
        details: error.JsonMalformed,
      }
    }

    if ('SemverParse' in error) {
      return {
        type: t`Erreur de version`,
        message: t`Version invalide`,
        details: error.SemverParse,
      }
    }
  }

  return {
    type: t`Erreur de version`,
    message: t`Erreur de version inconnue`,
    details: JSON.stringify(error, null, 2),
  }
}

export function formatErrorCause(cause: unknown): ReactNode {
  if (typeof cause === 'string') {
    return cause
  }

  if (
    typeof cause === 'object' &&
    cause !== null &&
    'message' in cause &&
    typeof (cause as Error).message === 'string'
  ) {
    return (cause as Error).message
  }

  // Essayer de formater comme une erreur TauRPC
  const formatted = formatTauRPCError(cause)

  return (
    <>
      {formatted.message}
      {formatted.details && (
        <>
          <br />
          <br />
          {formatted.details}
        </>
      )}
    </>
  )
}
