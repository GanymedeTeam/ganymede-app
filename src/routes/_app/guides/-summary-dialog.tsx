import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog.tsx'

export function SummaryDialog() {
  return (
    <Dialog>
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
