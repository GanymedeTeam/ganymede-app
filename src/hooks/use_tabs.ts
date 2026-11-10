import { create } from 'zustand'

import { OpenedGuide } from '@/lib/tabs.ts'

type State = {
  tabs: OpenedGuide[]
  activeTab: OpenedGuide | null
  setTabs: (tabs: OpenedGuide[]) => void
  addOrReplaceTab: (tab: OpenedGuide) => void
  removeTab: (tab: OpenedGuide) => void
}

export const useTabs = create<State>()((set) => ({
  tabs: [],
  activeTab: null,
  setTabs: (tabs) => set({ tabs }),
  addOrReplaceTab: (tab) =>
    set((state) => {
      // if tab.id is already in, override it on the same place
      const index = state.tabs.findIndex((t) => t === tab)

      if (index === -1) {
        return { tabs: [...state.tabs, tab], activeTab: tab }
      }

      return { tabs: state.tabs.map((t) => (t === tab ? tab : t)), activeTab: tab }
    }),
  removeTab: (tab) => {
    set((state) => {
      return { tabs: state.tabs.filter((t) => t !== tab) }
    })
  },
}))
