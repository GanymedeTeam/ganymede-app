import { Link } from '@tanstack/react-router'
import { FolderIcon } from 'lucide-react'
import { z } from 'zod'
import { Card } from '@/components/ui/card.tsx'
import { GuidesOrFolder } from '@/ipc/bindings.ts'
import { OpenedGuideZod } from '@/lib/tabs.ts'
import { cn } from '@/lib/utils.ts'

type Folder = Extract<GuidesOrFolder, { type: 'folder' }>

interface FolderItemProps {
  folder: Folder
  path: string
  isSelected: boolean
  onSelect: (folderPath: string) => void
  isSelectMode: boolean
  comesFromGuide?: z.infer<typeof OpenedGuideZod>
}

export function FolderItem({ folder, path, isSelected, onSelect, isSelectMode, comesFromGuide }: FolderItemProps) {
  const fullPath = `${path !== '' ? `${path}/` : ''}${folder.name}`
  const comesFromGuideMode = !!comesFromGuide

  return (
    <Card
      aria-selected={isSelected}
      asChild
      className={cn('flex items-center gap-2 p-2 xs:px-3 text-xxs xs:text-sm aria-selected:bg-accent sm:text-base')}
      key={folder.name}
    >
      <Link
        draggable={false}
        onClick={(evt) => {
          if (!isSelectMode) {
            return
          }

          evt.preventDefault()
          evt.stopPropagation()
          onSelect(fullPath)
        }}
        search={{
          path: fullPath,
          ...(comesFromGuideMode ? { from: comesFromGuide } : {}),
        }}
        to="/guides"
      >
        <span className="grow">{folder.name}</span>
        <FolderIcon className="size-4 xs:size-6 focus-visible:bg-white" />
      </Link>
    </Card>
  )
}
