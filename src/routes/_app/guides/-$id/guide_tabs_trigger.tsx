import { useNavigate } from "@tanstack/react-router";
import { debug } from "@tauri-apps/plugin-log";
import { XIcon } from "lucide-react";
import { useEffect } from "react";
import { DownloadImage } from "@/components/download_image.tsx";
import { GameIcon } from "@/components/game_icon.tsx";
import { TabsTrigger } from "@/components/ui/tabs.tsx";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip.tsx";
import { useGuideOrUndefined } from "@/hooks/use_guide.ts";
import { useProfile } from "@/hooks/use_profile.ts";
import { useTabs } from "@/hooks/use_tabs.ts";
import { clamp } from "@/lib/clamp.ts";
import { cn } from "@/lib/utils.ts";
import { getStepOr } from "@/lib/progress.ts";
import { useRegisterGuideClose } from "@/mutations/register_guide_close.mutation.ts";

export function GuideTabsTrigger({
  id,
  currentId,
}: {
  id: number;
  currentId: number;
}) {
  const guide = useGuideOrUndefined(id);
  const removeTab = useTabs((s) => s.removeTab);
  const registerGuideClose = useRegisterGuideClose();
  const tabs = useTabs((s) => s.tabs);
  const navigate = useNavigate();
  const profile = useProfile();

  useEffect(() => {
    if (!guide) {
      removeTab(id)
      registerGuideClose.mutate(id)
    }
  }, [guide, id, removeTab, registerGuideClose])

  if (!guide) {
    return null
  }

  const iconElement = guide.node_image ? (
    <DownloadImage
      src={guide.node_image}
      className="size-8 shrink-0 rounded object-cover"
    />
  ) : (
    <div className="shrink-0 rounded text-primary-foreground flex items-center justify-center">
      <GameIcon gameType={guide.game_type ?? 'dofus'} className="size-10" />
    </div>
  );

  const isActive = currentId === id;
  const totalSteps = guide.steps.length;
  const currentStep = profile.progresses.find((p) => p.id === id)?.currentStep ?? 0;
  const progressPercent = totalSteps <= 1 ? 100 : ((currentStep) / (totalSteps - 1)) * 100;

  return (
    <div className="group/tab relative flex shrink-0">
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <div
              className={cn(
                "relative flex items-center gap-1.5 px-3 py-1 font-medium text-xs xs:text-sm transition-all cursor-pointer whitespace-nowrap sm:px-3 md:px-4",
                isActive
                  ? "bg-surface-page text-foreground shadow-sm"
                  : "bg-surface-card text-foreground/75 hover:bg-surface-page/50"
              )}
            >
              <TabsTrigger
                value={id.toString()}
                className="!absolute !inset-0 !opacity-0 !w-full !h-full !p-0 !m-0"
              />
              {iconElement}
              <span className="hidden truncate sm:inline">{guide.name}</span>
              {/* Progress bar */}
              <div className="absolute bottom-0 left-0 h-0.5 w-full bg-black/20">
                <div
                  className="h-full bg-success transition-all duration-300"
                  style={{ width: `${Math.min(progressPercent, 100)}%` }}
                />
              </div>
            </div>
          </TooltipTrigger>
          <TooltipContent side="bottom" className="sm:hidden">
            {guide.name}
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
      <button
        className="absolute right-0 top-2 -translate-y-1/2 z-10 invisible cursor-pointer text-primary-foreground group-hover/tab:visible sm:right-1"
        onClick={async (evt) => {
          evt.stopPropagation();

          try {
            if (tabs.length === 1) {
              await navigate({
                to: "/guides",
                search: {
                  path: "",
                },
              });

              return;
            }

            const positionInList = tabs.findIndex((tab) => tab === id);

            debug(
              `Closing tab: ${id} at position ${positionInList} - current: ${currentId}`
            );

            if (currentId === id && positionInList !== -1) {
              const nextGuide = tabs.filter((tab) => tab !== id)[
                clamp(positionInList - 1, 0, tabs.length - 1)
              ];

              debug(`Navigating to next guide: ${nextGuide}`);

              // go to previous tab if it exists
              await navigate({
                to: "/guides/$id",
                params: {
                  id: nextGuide,
                },
                search: {
                  step: getStepOr(profile, nextGuide, 0),
                },
              });
            }
          } finally {
            removeTab(id);
            registerGuideClose.mutate(id);
          }
        }}
      >
        <XIcon className="size-4" />
      </button>
    </div>
  );
}
