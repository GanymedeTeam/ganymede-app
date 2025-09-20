import { useNavigate } from '@tanstack/react-router'
import { debug } from '@tauri-apps/plugin-log'
import { XIcon } from 'lucide-react'
import { useEffect } from 'react'
import { TabsTrigger } from '@/components/ui/tabs.tsx'
import { useGuideOrUndefined } from '@/hooks/use_guide.ts'
import { useProfile } from '@/hooks/use_profile.ts'
import { useTabs } from '@/hooks/use_tabs.ts'
import { clamp } from '@/lib/clamp.ts'
import { getStepOr } from '@/lib/progress.ts'
import { useRegisterGuideClose } from '@/mutations/register_guide_close.mutation.ts'

export function GuideTabsTrigger({ id, currentId }: { id: number; currentId: number }) {
  const guide = useGuideOrUndefined(id)
  const removeTab = useTabs((s) => s.removeTab)
  const registerGuideClose = useRegisterGuideClose()
  const tabs = useTabs((s) => s.tabs)
  const navigate = useNavigate()
  const profile = useProfile()

  useEffect(() => {
    if (!guide) {
      removeTab(id)
      registerGuideClose.mutate(id)
    }
  }, [guide, id, removeTab, registerGuideClose])

  if (!guide) {
    return null
  }

  // TODO: add node_image to the tab

  return (
    <div className="group/tab relative line-clamp-1 flex w-full justify-center">
      <TabsTrigger value={id.toString()} title={guide.name}>
        {guide.name}
      </TabsTrigger>
      <button
        className="center-y-absolute invisible absolute right-0.5 cursor-pointer text-primary-foreground group-hover/tab:visible"
        onClick={async (evt) => {
          evt.stopPropagation()

          try {
            if (tabs.length === 1) {
              await navigate({
                to: '/guides',
                search: {
                  path: '',
                },
              })

              return
            }

            const positionInList = tabs.findIndex((tab) => tab === id)

            debug(`Closing tab: ${id} at position ${positionInList} - current: ${currentId}`)

            if (currentId === id && positionInList !== -1) {
              const nextGuide = tabs.filter((tab) => tab !== id)[clamp(positionInList - 1, 0, tabs.length - 1)]

              debug(`Navigating to next guide: ${nextGuide}`)

              // go to previous tab if it exists
              await navigate({
                to: '/guides/$id',
                params: {
                  id: nextGuide,
                },
                search: {
                  step: getStepOr(profile, nextGuide, 0),
                },
              })
            }
          } finally {
            removeTab(id)
            registerGuideClose.mutate(id)
          }
        }}
      >
        <XIcon className="size-4" />
      </button>
    </div>
  )
}
