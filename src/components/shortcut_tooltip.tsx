import {
    Tooltip,
    TooltipContent,
    TooltipProvider,
    TooltipTrigger,
} from "@/components/ui/tooltip";
import type { PropsWithChildren, ReactNode } from "react";

interface ShortcutTooltipProps {
    shortcut?: string;
    description?: ReactNode;
    delayDuration?: number;
}

const MAC_SYMBOLS: Record<string, string> = {
    Command: "⌘",
    CommandOrControl: "⌘",
    Control: "⌃",
    Option: "⌥",
    Alt: "⌥",
    Shift: "⇧",
    Enter: "⏎",
    Backspace: "⌫",
    Escape: "Esc",
    ArrowUp: "↑",
    ArrowDown: "↓",
    ArrowLeft: "←",
    ArrowRight: "→",
    Space: "␣",
    Meta: "⌘",
};

const PC_SYMBOLS: Record<string, string> = {
    Command: "Ctrl",
    CommandOrControl: "Ctrl",
    Control: "Ctrl",
    Option: "Alt",
    Alt: "Alt",
    Shift: "Shift",
    Enter: "Enter",
    Backspace: "Backspace",
    Escape: "Esc",
    ArrowUp: "↑",
    ArrowDown: "↓",
    ArrowLeft: "←",
    ArrowRight: "→",
    Space: "Space",
    Meta: "Win",
};

const isMac =
    typeof navigator !== "undefined" &&
    /Mac|iPod|iPhone|iPad/.test(navigator.userAgent);

function formatKey(key: string): string {
    const map = isMac ? MAC_SYMBOLS : PC_SYMBOLS;
    return map[key] || key;
}

export function ShortcutTooltip({
    children,
    shortcut,
    description,
    delayDuration = 200,
}: PropsWithChildren<ShortcutTooltipProps>) {
    if (!shortcut && !description) {
        return <>{children}</>;
    }

    const parts = shortcut ? shortcut.split("+") : [];

    return (
        <TooltipProvider delayDuration={delayDuration}>
            <Tooltip>
                <TooltipTrigger asChild>{children}</TooltipTrigger>
                <TooltipContent
                    side="top"
                    className="flex items-center gap-2 text-xs"
                >
                    {description && <span>{description}</span>}
                    {parts.length > 0 && (
                        <div className="flex gap-0.5 text-muted-foreground">
                            {parts.map((part) => (
                                <kbd
                                    key={part}
                                    className="pointer-events-none inline-flex h-5 select-none items-center gap-1 rounded border bg-muted px-1.5 font-mono text-[10px] font-medium text-muted-foreground opacity-100 dark:text-foreground"
                                >
                                    <span className="text-xs">{formatKey(part)}</span>
                                </kbd>
                            ))}
                        </div>
                    )}
                </TooltipContent>
            </Tooltip>
        </TooltipProvider>
    );
}
