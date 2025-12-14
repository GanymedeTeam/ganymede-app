import { StepProgress } from "@/components/step_progress/step_progress.tsx";

export function ChangeStep({
  currentIndex,
  maxIndex,
  onPrevious,
  onNext,
  setCurrentIndex,
}: {
  currentIndex: number;
  maxIndex: number;
  onPrevious: () => Promise<boolean>;
  onNext: () => Promise<boolean>;
  setCurrentIndex: (index: number) => Promise<void>;
}) {
  return (
    <StepProgress
      currentIndex={currentIndex}
      maxIndex={maxIndex}
      onPrevious={onPrevious}
      onNext={onNext}
      onChangeStep={setCurrentIndex}
    />
  );
}

