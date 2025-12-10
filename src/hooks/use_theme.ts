import { useEffect, useState } from 'react';

export type ThemeId = 'default' | 'standard' | 'bonta' | 'brakmar' | 'tribute' | 'gold-steel' | 'belladone' | 'unicorn' | 'emerald' | 'sufokia' | 'pandala' | 'wabbit';

export interface ThemeConfig {
  id: ThemeId;
  name: string;
  colors: {
    surfacePage: string;
    surfaceCard: string;
    accent: string;
  };
}

export const THEMES: ThemeConfig[] = [
  {
    id: 'default',
    name: 'Défaut',
    colors: {
      surfacePage: '#1D2730',
      surfaceCard: '#21303C',
      accent: '#e7c272',
    },
  },
  {
    id: 'standard',
    name: 'Standard',
    colors: {
      surfacePage: '#1A1A24',
      surfaceCard: '#22222E',
      accent: '#77769D',
    },
  },
  {
    id: 'bonta',
    name: 'Bonta',
    colors: {
      surfacePage: '#141C28',
      surfaceCard: '#1A2433',
      accent: '#607FB3',
    },
  },
  {
    id: 'brakmar',
    name: 'Brakmar',
    colors: {
      surfacePage: '#1E1418',
      surfaceCard: '#281A1F',
      accent: '#A23D4E',
    },
  },
  {
    id: 'tribute',
    name: 'Tribute',
    colors: {
      surfacePage: '#1A1A1A',
      surfaceCard: '#222222',
      accent: '#7C7D7B',
    },
  },
  {
    id: 'gold-steel',
    name: 'Gold & Steel',
    colors: {
      surfacePage: '#1C1814',
      surfaceCard: '#251F1A',
      accent: '#AA7C54',
    },
  },
  {
    id: 'belladone',
    name: 'Belladone',
    colors: {
      surfacePage: '#1A181C',
      surfaceCard: '#231F26',
      accent: '#8D7B9C',
    },
  },
  {
    id: 'unicorn',
    name: 'Unicorn',
    colors: {
      surfacePage: '#1C161C',
      surfaceCard: '#261D26',
      accent: '#976097',
    },
  },
  {
    id: 'emerald',
    name: 'Emerald Mine',
    colors: {
      surfacePage: '#14191A',
      surfaceCard: '#1A2223',
      accent: '#5F8D91',
    },
  },
  {
    id: 'sufokia',
    name: 'Sufokia',
    colors: {
      surfacePage: '#121A1A',
      surfaceCard: '#182323',
      accent: '#498384',
    },
  },
  {
    id: 'pandala',
    name: 'Pandala',
    colors: {
      surfacePage: '#171A14',
      surfaceCard: '#1E221A',
      accent: '#76944F',
    },
  },
  {
    id: 'wabbit',
    name: 'Wabbit',
    colors: {
      surfacePage: '#1E1614',
      surfaceCard: '#281D1A',
      accent: '#C46647',
    },
  },
];

const STORAGE_KEY = 'ganymede-theme';

function getStoredTheme(): ThemeId {
  if (typeof window === 'undefined') return 'default';
  return (localStorage.getItem(STORAGE_KEY) as ThemeId) || 'default';
}

function applyTheme(themeId: ThemeId) {
  if (themeId === 'default') {
    document.documentElement.removeAttribute('data-theme');
  } else {
    document.documentElement.setAttribute('data-theme', themeId);
  }
}

export function useTheme() {
  const [theme, setThemeState] = useState<ThemeId>(getStoredTheme);

  useEffect(() => {
    applyTheme(theme);
  }, [theme]);

  // Apply theme on mount
  useEffect(() => {
    applyTheme(getStoredTheme());
  }, []);

  const setTheme = (themeId: ThemeId) => {
    localStorage.setItem(STORAGE_KEY, themeId);
    setThemeState(themeId);
  };

  return { theme, setTheme, themes: THEMES };
}
