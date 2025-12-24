import { Trans, useLingui } from '@lingui/react/macro'
import { useQuery } from '@tanstack/react-query'
import { Link, useLocation } from '@tanstack/react-router'
import { getCurrentWindow } from '@tauri-apps/api/window'
import { error } from '@tauri-apps/plugin-log'
import {
  CloudDownloadIcon,
  CrosshairIcon,
  HomeIcon,
  LocateIcon,
  LogInIcon,
  LogOutIcon,
  MapIcon,
  MenuIcon,
  MinusIcon,
  NotebookPenIcon,
  NotebookTextIcon,
  SettingsIcon,
  XIcon,
} from 'lucide-react'
import { toast } from 'sonner'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown_menu.tsx'
import { useIsBodyLockedFromDialog } from '@/hooks/use_is_body_locked_from_dialog.ts'
import { isInImageViewerPath } from '@/lib/image_viewer.ts'
import { useCleanAuthTokens } from '@/mutations/clean_auth_tokens.mutation.ts'
import { useOpenUrlInBrowser } from '@/mutations/open_url_in_browser.ts'
import { useStartOAuthFlow } from '@/mutations/start_oauth_flow.mutation.ts'
import { getAuthTokensQuery } from '@/queries/get_auth_tokens.query.ts'
import { KoFiIcon } from './icons/ko_fi_icon.tsx'

const appWindow = getCurrentWindow()

export function TitleBar() {
  const { t } = useLingui()
  const location = useLocation()
  const openInBrowser = useOpenUrlInBrowser()
  const isBodyLocked = useIsBodyLockedFromDialog()
  const startOAuthFlow = useStartOAuthFlow()
  const authTokens = useQuery(getAuthTokensQuery)
  const cleanAuthTokens = useCleanAuthTokens()

  const linksAreDisabled = location.pathname.includes('app-old-version')
  const isImageViewer = isInImageViewerPath(location.pathname)
  const title = location.search.title || 'Ganymède'

  return (
    <div className="sticky top-0 z-60 flex h-titlebar items-center bg-surface-inset text-primary-foreground">
      {!linksAreDisabled && !isImageViewer && (
        <DropdownMenu>
          <DropdownMenuTrigger className="h-full px-2 outline-hidden" disabled={isBodyLocked}>
            <MenuIcon className="size-4" />
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" alignOffset={6} sideOffset={0}>
            {authTokens.isSuccess && authTokens.data !== null ? (
              <DropdownMenuItem
                className="gap-2"
                disabled={cleanAuthTokens.isPending}
                onClick={async () => {
                  try {
                    await cleanAuthTokens.mutateAsync()

                    toast.success(t`Déconnecté`)
                  } catch (err) {
                    error('Failed to clean auth tokens: ' + (err instanceof Error ? err.message : String(err)))

                    toast.error(t`Une erreur est survenue lors de la déconnexion`)
                  }
                }}
              >
                <LogOutIcon />
                <Trans>Se déconnecter</Trans>
              </DropdownMenuItem>
            ) : (
              <DropdownMenuItem
                asChild
                className="gap-2"
                disabled={startOAuthFlow.isPending}
                onClick={() => {
                  startOAuthFlow.mutate()
                }}
              >
                <Link draggable={false} to="/oauth/waiting">
                  <LogInIcon />
                  <Trans>Se connecter</Trans>
                </Link>
              </DropdownMenuItem>
            )}
            <DropdownMenuSeparator />
            <DropdownMenuItem asChild className="gap-2">
              <Link draggable={false} to="/">
                <HomeIcon />
                <Trans>Accueil</Trans>
              </Link>
            </DropdownMenuItem>
            <DropdownMenuItem asChild className="gap-2">
              <Link draggable={false} search={{ path: '' }} to="/guides">
                <NotebookTextIcon />
                <Trans>Guides</Trans>
              </Link>
            </DropdownMenuItem>
            <DropdownMenuItem asChild className="gap-2">
              <Link draggable={false} to="/downloads">
                <CloudDownloadIcon />
                <Trans>Télécharger un guide</Trans>
              </Link>
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem asChild className="gap-2">
              <Link draggable={false} to="/auto-pilot">
                <LocateIcon />
                <Trans>Autopilotage</Trans>
              </Link>
            </DropdownMenuItem>
            <DropdownMenuItem asChild className="gap-2">
              <Link draggable={false} to="/notes">
                <NotebookPenIcon />
                <Trans>Notes</Trans>
              </Link>
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem asChild className="gap-2">
              <Link draggable={false} to="/dofusdb/map">
                <MapIcon />
                <Trans>Carte</Trans>
              </Link>
            </DropdownMenuItem>
            <DropdownMenuItem asChild className="gap-2">
              <Link draggable={false} to="/dofusdb/hunt">
                <CrosshairIcon />
                <Trans>Chasse au trésor</Trans>
              </Link>
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              className="gap-2 bg-red-700 font-semibold focus-visible:bg-red-600"
              onClick={() => openInBrowser.mutate('https://ko-fi.com/ganymededofus')}
            >
              <KoFiIcon />
              <Trans>Supporter Ganymède</Trans>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      )}
      <p className="center-absolute cursor-default select-none text-center font-semibold text-sm sm:text-base">
        {title}
      </p>
      <p className="relative z-10 size-full grow" data-tauri-drag-region="" />
      <div className="flex h-full justify-end">
        {!linksAreDisabled && !isImageViewer && (
          <Link
            className="inline-flex h-titlebar w-6 xs:w-titlebar items-center justify-center hover:bg-surface-card aria-disabled:pointer-events-none"
            disabled={location.pathname === '/settings' || isBodyLocked}
            draggable={false}
            search={{
              from: location.pathname,
              search: location.search,
              hash: location.hash,
              state: location.state,
            }}
            title={t`Paramètres`}
            to="/settings"
          >
            <SettingsIcon className="size-4" />
          </Link>
        )}
        <button
          className="inline-flex h-titlebar w-6 xs:w-titlebar items-center justify-center hover:bg-surface-card"
          id="titlebar-minimize"
          onClick={async () => {
            await appWindow.minimize()
          }}
          title={t`Réduire`}
        >
          <MinusIcon className="size-4" />
        </button>
        <button
          className="inline-flex h-titlebar w-6 xs:w-titlebar items-center justify-center hover:bg-destructive"
          id="titlebar-close"
          onClick={async () => {
            await appWindow.close()
          }}
          title={t`Fermer`}
        >
          <XIcon className="size-4" />
        </button>
      </div>
    </div>
  )
}
