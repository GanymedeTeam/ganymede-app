import { Trans, useLingui } from '@lingui/react/macro';
import { ExternalLinkIcon } from 'lucide-react';
import { openUrl } from '@tauri-apps/plugin-opener';
import { DiscordIcon } from '@/components/icons/discord_icon.tsx';
import { TwitterIcon } from '@/components/icons/twitter_icon.tsx';
import { GANYMEDE_HOST } from '@/lib/api.ts';

const socialLinks = [
    { icon: DiscordIcon, size: 'size-5', action: () => openUrl('https://discord.gg/fxWuXB3dct'), label: 'Discord de Ganymède' },
    { icon: TwitterIcon, size: 'size-4', action: () => openUrl('https://x.com/GanymedeDofus'), label: 'Twitter de Ganymède' },
    { icon: ExternalLinkIcon, size: 'size-4', action: () => openUrl(`https://${GANYMEDE_HOST}`), label: 'Site officiel' },
] as const;

export function HomeFooter() {
    const { t } = useLingui();

    return (
        <div className="flex flex-col gap-3 mt-auto pt-2">
            <div className="flex items-center justify-center gap-1">
                {socialLinks.map(({ icon: Icon, size, action, label }) => (
                    <button
                        key={label}
                        type="button"
                        onClick={action}
                        className="flex size-10 items-center justify-center rounded-lg bg-surface-card border border-border-muted hover:bg-surface-inset/70 transition-colors cursor-pointer"
                        title={t({ message: label })}
                    >
                        <Icon className={`${size} text-accent`} />
                    </button>
                ))}
            </div>
            <p className="text-center text-xxs text-muted-foreground">
                <Trans>Ganymède - Non affilié à Ankama Games</Trans>
            </p>
        </div>
    );
}
