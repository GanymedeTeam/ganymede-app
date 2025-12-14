import { useLingui } from "@lingui/react/macro";
import { useSuspenseQuery } from "@tanstack/react-query";
import { useNavigate } from "@tanstack/react-router";
import { writeText } from "@tauri-apps/plugin-clipboard-manager";
import { useEffect, useRef } from "react";
import { toast } from "sonner";
import { ChangeStep } from "@/components/step_progress/change_step.tsx";
import { GuideFrame } from "@/components/guide_frame.tsx";
import { Position } from "@/components/position.tsx";
import { useGuide } from "@/hooks/use_guide.ts";
import { useScrollToTop } from "@/hooks/use_scroll_to_top.ts";
import { onCopyCurrentGuideStep } from "@/ipc/guides.ts";
import { cn } from "@/lib/utils.ts";
import { useSetConf } from "@/mutations/set_conf.mutation.ts";
import { confQuery } from "@/queries/conf.query.ts";
import { ReportDialog } from "./report_dialog.tsx";
import { SummaryDialog } from "./summary_dialog.tsx";

const useOnCopyStep = (cb: () => void) => {
  useEffect(() => {
    const unlisten = onCopyCurrentGuideStep().on(cb);

    return () => {
      unlisten.then((cb) => cb());
    };
  }, [cb]);
};

export function GuidePage({
  id,
  stepIndex: index,
}: {
  id: number;
  stepIndex: number;
}) {
  const { t } = useLingui();
  const guide = useGuide(id);
  const step = guide.steps[index];
  const stepMax = guide.steps.length - 1;
  const scrollableRef = useRef<HTMLDivElement>(null);
  const conf = useSuspenseQuery(confQuery);
  const setConf = useSetConf();
  const navigate = useNavigate();

  useScrollToTop(scrollableRef, [step]);

  const changeStep = async (nextStep: number) => {
    await setConf.mutateAsync({
      ...conf.data,
      profiles: conf.data.profiles.map((p) => {
        if (p.id === conf.data.profileInUse) {
          const existingProgress = p.progresses.find(
            (progress) => progress.id === guide.id
          );

          return {
            ...p,
            progresses: existingProgress
              ? p.progresses.map((progress) => {
                if (progress.id === guide.id) {
                  return {
                    ...progress,
                    currentStep:
                      nextStep < 0
                        ? 0
                        : nextStep >= guide.steps.length
                          ? stepMax
                          : nextStep,
                  };
                }

                return progress;
              })
              : [
                ...p.progresses,
                {
                  id: guide.id,
                  currentStep: 1, // 1 means the second step
                  steps: {},
                },
              ],
          };
        }

        return p;
      }),
    });

    await navigate({
      to: "/guides/$id",
      params: {
        id: guide.id,
      },
      search: {
        step: nextStep,
      },
    });
  };

  const onClickPrevious = async (): Promise<boolean> => {
    if (index === 0) {
      return false;
    }

    await changeStep(index - 1);

    return true;
  };

  const onClickNext = async (): Promise<boolean> => {
    if (index === stepMax) {
      return false;
    }

    await changeStep(index + 1);

    return true;
  };

  const onChangeStep = async (stepIndex: number): Promise<boolean> => {
    if (index === stepIndex) {
      return false;
    }

    await changeStep(stepIndex);

    return true;
  };

  useOnCopyStep(() => {
    toast
      .promise(writeText((index + 1).toString()), {
        success: t`Le numéro de l'étape (${index + 1
          }) a été copié dans le presse-papiers.`,
        error: t`Erreur lors de la copie du numéro de l'étape (${index + 1}).`,
        loading: t`Copie du numéro de l'étape (${index + 1})...`,
      })
      .unwrap();
  });



  // Use theme-aware background color with opacity via CSS color-mix
  const bgColor = `color-mix(in srgb, var(--color-surface-page) ${conf.data.opacity * 100}%, transparent)`;

  return (
    <div
      ref={scrollableRef}
      className="scroller mt-[40px] flex h-[calc(100vh-var(--spacing-titlebar)-40px-40px)] flex-col overflow-x-hidden overflow-y-scroll pb-2"
      style={{ backgroundColor: bgColor }}
    >
      <header className="fixed inset-x-0 top-[70px] z-10 sm:top-[66px]" style={{ backgroundColor: bgColor }}>
        <div className="flex h-10 items-center p-1">
          {step && (
            <>
              {/* Left Side - Fixed width to maintain center balance */}
              <div className="flex w-16 shrink-0 items-center justify-start pl-2">
                {step.map !== null && step.map.toLowerCase() !== "nomap" && (
                  <Position pos_x={step.pos_x} pos_y={step.pos_y} />
                )}
              </div>

              {/* Center - Progress Bar */}
              <div className="flex flex-1 items-center justify-center">
                <ChangeStep
                  key={`${guide.id}-${index}`}
                  currentIndex={index}
                  maxIndex={stepMax}
                  onPrevious={onClickPrevious}
                  onNext={onClickNext}
                  setCurrentIndex={async (currentIndex) => {
                    return changeStep(currentIndex);
                  }}
                />
              </div>

              {/* Right Side - Fixed width to maintain center balance */}
              <div className="flex w-18 shrink-0 items-center justify-end pr-2 gap-1">
                {guide.game_type !== "wakfu" && (
                  <SummaryDialog
                    guideId={guide.id}
                    onChangeStep={onChangeStep}
                  />
                )}
                {(guide.status === "gp" || guide.status === "certified") && (
                  <ReportDialog guideId={guide.id} stepIndex={index} />
                )}
              </div>
            </>
          )}
        </div>
      </header>
      {step && (
        <GuideFrame
          className={cn(
            "guide px-2 xs:px-3 pt-2 xs:pt-3 leading-5 sm:px-4 sm:pt-4",
            conf.data.fontSize === "ExtraSmall" && "text-xs",
            conf.data.fontSize === "Small" && "text-sm leading-4",
            conf.data.fontSize === "Large" && "text-md leading-5",
            conf.data.fontSize === "ExtraLarge" && "text-lg leading-6"
          )}
          guideId={guide.id}
          html={step.web_text}
          stepIndex={index}
        />
      )}
    </div>
  );
}
