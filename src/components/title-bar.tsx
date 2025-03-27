import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu.tsx'
import { useOpenUrlInBrowser } from '@/mutations/open-url-in-browser.ts'
import { Trans, useLingui } from '@lingui/react/macro'
import { Link, useLocation } from '@tanstack/react-router'
import { getCurrentWindow } from '@tauri-apps/api/window'
import {
  CloudDownloadIcon,
  CrosshairIcon,
  HomeIcon,
  LocateIcon,
  MapIcon,
  MenuIcon,
  MinusIcon,
  NotebookPenIcon,
  NotebookTextIcon,
  SettingsIcon,
  XIcon,
} from 'lucide-react'
import { KoFiIcon } from './icons/ko-fi-icon.tsx'

const appWindow = getCurrentWindow()

export function TitleBar() {
  const { t } = useLingui()
  const location = useLocation()
  const openInBrowser = useOpenUrlInBrowser()

  const linksAreDisabled = location.pathname.includes('app-old-version')

  return (
    <div className="sticky top-0 z-10 flex h-[30px] items-center bg-primary text-primary-foreground">
      {!linksAreDisabled && (
        <DropdownMenu>
          <DropdownMenuTrigger className="h-full px-2 outline-hidden">
            <MenuIcon className="size-4" />
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" alignOffset={6} sideOffset={0}>
            <DropdownMenuItem className="gap-2" asChild>
              <Link to="/" draggable={false}>
                <HomeIcon />
                <Trans>Accueil</Trans>
              </Link>
            </DropdownMenuItem>
            <DropdownMenuItem className="gap-2" asChild>
              <Link to="/guides" search={{ path: '' }} draggable={false}>
                <NotebookTextIcon />
                <Trans>Guides</Trans>
              </Link>
            </DropdownMenuItem>
            <DropdownMenuItem className="gap-2" asChild>
              <Link to="/downloads" draggable={false}>
                <CloudDownloadIcon />
                <Trans>Télécharger un guide</Trans>
              </Link>
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem className="gap-2" asChild>
              <Link to="/auto-pilot" draggable={false}>
                <LocateIcon />
                <Trans>Autopilotage</Trans>
              </Link>
            </DropdownMenuItem>
            <DropdownMenuItem className="gap-2" asChild>
              <Link to="/notes" draggable={false}>
                <NotebookPenIcon />
                <Trans>Notes</Trans>
              </Link>
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem className="gap-2" asChild>
              <Link to="/dofusdb/map" draggable={false}>
                <MapIcon />
                <Trans>Carte</Trans>
              </Link>
            </DropdownMenuItem>
            <DropdownMenuItem className="gap-2" asChild>
              <Link to="/dofusdb/hunt" draggable={false}>
                <CrosshairIcon />
                <Trans>Chasse au trésor</Trans>
              </Link>
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem className="gap-2" onClick={() => openInBrowser.mutate('https://ko-fi.com/ganymededofus')}>
              <KoFiIcon />
              <Trans>Supporter Ganymède</Trans>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      )}
      <p className="center-absolute cursor-default select-none text-center font-semibold text-sm sm:text-base">
        Ganymède
      </p>
      <p data-tauri-drag-region="" className="relative z-10 size-full grow" />
      <div className="flex justify-end">
        {!linksAreDisabled && (
          <Link
            to="/settings"
            search={{
              from: location.pathname,
              search: location.search,
              hash: location.hash,
              state: location.state,
            }}
            className="inline-flex size-7 items-center justify-center hover:bg-primary-800 aria-disabled:pointer-events-none"
            draggable={false}
            title={t`Paramètres`}
            disabled={location.pathname === '/settings'}
          >
            <SettingsIcon className="size-4" />
          </Link>
        )}
        <button
          onClick={async () => {
            await appWindow.minimize()
          }}
          className="inline-flex size-7 items-center justify-center hover:bg-primary-800"
          id="titlebar-minimize"
          title={t`Réduire`}
        >
          <MinusIcon className="size-4" />
        </button>
        <button
          onClick={async () => {
            await appWindow.close()
          }}
          className="inline-flex size-7 items-center justify-center hover:bg-destructive"
          id="titlebar-close"
          title={t`Fermer`}
        >
          <XIcon className="size-4" />
        </button>
      </div>
    </div>
  )
}
