import { Trans } from '@lingui/react/macro'
import { useSuspenseQuery } from '@tanstack/react-query'
import { PropsWithChildren, Suspense } from 'react'
import { Button } from '@/components/ui/button.tsx'
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog.tsx'
import { ScrollArea } from '@/components/ui/scroll_area.tsx'
import { UpdateAllAtOnceResult } from '@/ipc/bindings.ts'
import { getGuideById } from '@/lib/guide.ts'
import { guidesQuery } from '@/queries/guides.query.ts'

function Item({ guideId, error }: { guideId: number; error: string }) {
  const guides = useSuspenseQuery(guidesQuery())

  const guide = getGuideById(guides.data, guideId)

  return (
    <div className="flex flex-col items-center gap-1 rounded-lg bg-accent p-2 leading-5">
      <h3 className="font-semibold text-sm">
        {guide ? (
          <>
            ID {guide.id} — {guide.name}
          </>
        ) : (
          <>ID {guideId}</>
        )}
      </h3>
      <p className="text-balance px-4 text-center">{error}</p>
    </div>
  )
}

export function GuideUpdateAllResultDialog({
  children,
  result,
}: PropsWithChildren<{ result: Partial<Record<number, UpdateAllAtOnceResult>> }>) {
  return (
    <Dialog>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent className="flex h-full max-h-[90vh] flex-col">
        <DialogHeader>
          <DialogTitle>
            <Trans>Mise à jour des guides</Trans>
          </DialogTitle>
          <DialogDescription>
            <Trans>Certains guides n'ont pas été mis à jour</Trans>
          </DialogDescription>
        </DialogHeader>

        <ScrollArea className="h-full">
          <div className="flex flex-col gap-2">
            {Object.entries(result)
              .filter(([, v]) => v !== null)
              .map(([id, error]) => {
                // filter already remove null values
                return (
                  <Suspense key={id}>
                    <Item error={error as string} guideId={Number(id)} />
                  </Suspense>
                )
              })}
          </div>
        </ScrollArea>
        <DialogFooter>
          <DialogClose asChild>
            <Button variant="outline">
              <Trans>Fermer</Trans>
            </Button>
          </DialogClose>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
