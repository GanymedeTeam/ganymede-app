import { Trans } from '@lingui/react/macro'
import { openUrl } from '@tauri-apps/plugin-opener'
import { ExternalLinkIcon } from 'lucide-react'
import { DiscordIcon } from '@/components/icons/discord_icon.tsx'
import { TwitterIcon } from '@/components/icons/twitter_icon.tsx'
import { GANYMEDE_HOST } from '@/lib/api.ts'

const socialLinks = [
  { icon: DiscordIcon, size: 'size-5', url: 'https://discord.gg/fxWuXB3dct' },
  { icon: TwitterIcon, size: 'size-4', url: 'https://x.com/GanymedeDofus' },
  { icon: ExternalLinkIcon, size: 'size-4', url: `https://${GANYMEDE_HOST}` },
] as const

export function HomeFooter() {
  return (
    <div className="mt-auto flex flex-col gap-3 pt-2">
      <div className="flex items-center justify-center gap-1">
        {socialLinks.map(({ icon: Icon, size, url }) => (
          <button
            key={url}
            type="button"
            onClick={() => openUrl(url)}
            className="flex size-10 cursor-pointer items-center justify-center rounded-lg border border-border-muted bg-surface-card transition-colors hover:bg-surface-inset/70"
          >
            <Icon className={`${size} text-accent`} />
          </button>
        ))}
      </div>
      <p className="text-center text-muted-foreground text-xxs">
        <Trans>Ganymède - Non affilié à Ankama Games</Trans>
      </p>
    </div>
  )
}
