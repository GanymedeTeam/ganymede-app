import { useQuery } from '@tanstack/react-query'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog.tsx'
import { summaryQuery } from '@/queries/summary.query.ts'
import { useState } from 'react'

export function SummaryDialog({
  guideId,
}: {
  guideId: number
}) {
  const [open, setOpen] = useState(false)
  const summary = useQuery({
    ...summaryQuery(guideId),
    enabled: open,
  })

  console.log(summary)

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger>S</DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Toto</DialogTitle>
          <DialogDescription>Summary</DialogDescription>
        </DialogHeader>
        <div>Toto</div>
      </DialogContent>
    </Dialog>
  )
}
