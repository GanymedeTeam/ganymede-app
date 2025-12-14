import { Trans } from '@lingui/react/macro';
import { CheckIcon, ChevronDownIcon } from 'lucide-react';
import { useState } from 'react';
import { useTheme } from '@/hooks/use_theme';
import { type ConfTheme } from '@/ipc/bindings';
import { cn } from '@/lib/utils';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';

interface ThemePreviewProps {
    theme: { id: ConfTheme; name: string; accent: string; surface: string };
    isSelected: boolean;
    onSelect: () => void;
}

function ThemePreview({ theme, isSelected, onSelect }: ThemePreviewProps) {
    return (
        <button
            type="button"
            onClick={onSelect}
            className={cn(
                'relative flex flex-col gap-1 p-1.5 rounded-lg border-2 transition-all w-full',
                isSelected ? 'border-success ring-2 ring-success/30' : 'border-transparent hover:border-border-muted'
            )}
            style={{ backgroundColor: theme.surface }}
        >
            <div className="flex flex-col gap-0.5 w-full">
                <div className="h-1.5 rounded-sm w-full" style={{ backgroundColor: `color-mix(in srgb, ${theme.surface} 70%, white)` }} />
                <div className="flex gap-0.5">
                    <div className="flex-1 h-4 rounded-sm flex items-center justify-center" style={{ backgroundColor: `color-mix(in srgb, ${theme.surface} 70%, white)` }}>
                        <div className="w-3 h-0.5 rounded-full" style={{ backgroundColor: theme.accent }} />
                    </div>
                    <div className="flex-1 h-4 rounded-sm" style={{ backgroundColor: `color-mix(in srgb, ${theme.surface} 70%, white)` }} />
                </div>
            </div>
            <span className="text-xxs font-medium text-center truncate w-full">{theme.name}</span>
            {isSelected && (
                <div className="absolute -top-1 -right-1 size-4 rounded-full bg-success flex items-center justify-center">
                    <CheckIcon className="size-2.5 text-surface-page" />
                </div>
            )}
        </button>
    );
}

export function ThemeSelector() {
    const { theme, setTheme, themes } = useTheme();
    const [isOpen, setIsOpen] = useState(false);
    const current = themes.find((t) => t.id === theme) ?? themes[0];

    return (
        <div className="flex flex-col gap-2">
            <Collapsible open={isOpen} onOpenChange={setIsOpen}>
                <CollapsibleTrigger className="flex items-center justify-between w-full group cursor-pointer">
                    <p className="font-medium text-xs leading-none"><Trans>Thème</Trans></p>
                    <div className="flex items-center gap-2">
                        <span className="text-xs text-muted-foreground">{current.name}</span>
                        <div className="size-4 rounded-full border border-border-muted" style={{ backgroundColor: current.accent }} />
                        <ChevronDownIcon className={cn('size-4 text-muted-foreground transition-transform', isOpen && 'rotate-180')} />
                    </div>
                </CollapsibleTrigger>
                <CollapsibleContent className="pt-3">
                    <div className="grid grid-cols-4 gap-1.5">
                        {themes.map((t) => (
                            <ThemePreview key={t.id} theme={t} isSelected={theme === t.id} onSelect={() => setTheme(t.id)} />
                        ))}
                    </div>
                </CollapsibleContent>
            </Collapsible>
        </div>
    );
}
