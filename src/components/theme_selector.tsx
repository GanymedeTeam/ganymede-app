import { Trans } from '@lingui/react/macro';
import { CheckIcon, ChevronDownIcon } from 'lucide-react';
import { useState } from 'react';
import { type ThemeConfig, useTheme } from '@/hooks/use_theme';
import { cn } from '@/lib/utils';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';

interface ThemePreviewProps {
    theme: ThemeConfig;
    isSelected: boolean;
    onSelect: () => void;
}

function ThemePreview({ theme, isSelected, onSelect }: ThemePreviewProps) {
    const { colors } = theme;

    return (
        <button
            type="button"
            onClick={onSelect}
            className={cn(
                'relative flex flex-col gap-1 p-1.5 rounded-lg border-2 transition-all w-full',
                isSelected
                    ? 'border-success ring-2 ring-success/30'
                    : 'border-transparent hover:border-border-muted'
            )}
            style={{ backgroundColor: colors.surfacePage }}
        >
            {/* Mini preview UI */}
            <div className="flex flex-col gap-0.5 w-full">
                {/* Header bar */}
                <div
                    className="h-1.5 rounded-sm w-full"
                    style={{ backgroundColor: colors.surfaceCard }}
                />

                {/* Cards */}
                <div className="flex gap-0.5">
                    <div
                        className="flex-1 h-4 rounded-sm flex items-center justify-center"
                        style={{ backgroundColor: colors.surfaceCard }}
                    >
                        <div
                            className="w-3 h-0.5 rounded-full"
                            style={{ backgroundColor: colors.accent }}
                        />
                    </div>
                    <div
                        className="flex-1 h-4 rounded-sm"
                        style={{ backgroundColor: colors.surfaceCard }}
                    />
                </div>
            </div>

            {/* Theme name */}
            <span className="text-xxs font-medium text-center truncate w-full">{theme.name}</span>

            {/* Selected indicator */}
            {isSelected && (
                <div className="absolute -top-1 -right-1 size-4 rounded-full bg-success flex items-center justify-center">
                    <CheckIcon className="size-2.5 text-surface-page" />
                </div>
            )}
        </button>
    );
}

export function ThemeSelector() {
    const { theme: currentTheme, setTheme, themes } = useTheme();
    const [isOpen, setIsOpen] = useState(false);

    const currentThemeConfig = themes.find((t) => t.id === currentTheme) ?? themes[0];

    return (
        <div className="flex flex-col gap-2">
            <Collapsible open={isOpen} onOpenChange={setIsOpen}>
                <CollapsibleTrigger className="flex items-center justify-between w-full group">
                    <p className="font-medium text-xs leading-none">
                        <Trans>Thème</Trans>
                    </p>
                    <div className="flex items-center gap-2">
                        <span className="text-xs text-muted-foreground">{currentThemeConfig.name}</span>
                        <div
                            className="size-4 rounded-full border border-border-muted"
                            style={{ backgroundColor: currentThemeConfig.colors.accent }}
                        />
                        <ChevronDownIcon
                            className={cn(
                                'size-4 text-muted-foreground transition-transform',
                                isOpen && 'rotate-180'
                            )}
                        />
                    </div>
                </CollapsibleTrigger>
                <CollapsibleContent className="pt-3">
                    <div className="grid grid-cols-4 gap-1.5">
                        {themes.map((themeConfig) => (
                            <ThemePreview
                                key={themeConfig.id}
                                theme={themeConfig}
                                isSelected={currentTheme === themeConfig.id}
                                onSelect={() => setTheme(themeConfig.id)}
                            />
                        ))}
                    </div>
                </CollapsibleContent>
            </Collapsible>
        </div>
    );
}
