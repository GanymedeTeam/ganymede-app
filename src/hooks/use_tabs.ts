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
  // Keeps the same array when the tab is already opened, so subscribers do not re-render.
  addOrReplaceTab: (tab) =>
    set((state) => ({
      tabs: state.tabs.includes(tab) ? state.tabs : [...state.tabs, tab],
      activeTab: tab,
    })),
  removeTab: (tab) => {
    set((state) => {
      return { tabs: state.tabs.filter((t) => t !== tab) }
    })
  },
}))
