import { useSuspenseQuery } from '@tanstack/react-query';
import { useEffect } from 'react';
import { type ConfTheme } from '@/ipc/bindings.ts';
import { useSetConf } from '@/mutations/set_conf.mutation.ts';
import { confQuery } from '@/queries/conf.query.ts';

export const THEMES: { id: ConfTheme; name: string; accent: string; surface: string }[] = [
  { id: 'Default', name: 'Défaut', accent: '#e7c272', surface: '#1D2730' },
  { id: 'Standard', name: 'Standard', accent: '#77769D', surface: '#1A1A24' },
  { id: 'Bonta', name: 'Bonta', accent: '#607FB3', surface: '#141C28' },
  { id: 'Brakmar', name: 'Brakmar', accent: '#A23D4E', surface: '#1E1418' },
  { id: 'Tribute', name: 'Tribute', accent: '#7C7D7B', surface: '#1A1A1A' },
  { id: 'GoldSteel', name: 'Gold & Steel', accent: '#AA7C54', surface: '#1C1814' },
  { id: 'Belladone', name: 'Belladone', accent: '#8D7B9C', surface: '#1A181C' },
  { id: 'Unicorn', name: 'Unicorn', accent: '#976097', surface: '#1C161C' },
  { id: 'Emerald', name: 'Emerald Mine', accent: '#5F8D91', surface: '#14191A' },
  { id: 'Sufokia', name: 'Sufokia', accent: '#498384', surface: '#121A1A' },
  { id: 'Pandala', name: 'Pandala', accent: '#76944F', surface: '#171A14' },
  { id: 'Wabbit', name: 'Wabbit', accent: '#C46647', surface: '#1E1614' },
];

const themeToDataAttr: Record<ConfTheme, string> = {
  Default: '', Standard: 'standard', Bonta: 'bonta', Brakmar: 'brakmar',
  Tribute: 'tribute', GoldSteel: 'gold-steel', Belladone: 'belladone',
  Unicorn: 'unicorn', Emerald: 'emerald', Sufokia: 'sufokia',
  Pandala: 'pandala', Wabbit: 'wabbit',
};

export function applyTheme(theme: ConfTheme | undefined) {
  const attr = themeToDataAttr[theme ?? 'Default'];
  if (attr) {
    document.documentElement.setAttribute('data-theme', attr);
  } else {
    document.documentElement.removeAttribute('data-theme');
  }
}

export function useTheme() {
  const conf = useSuspenseQuery(confQuery);
  const setConf = useSetConf();
  const theme = conf.data.theme ?? 'Default';

  useEffect(() => applyTheme(theme), [theme]);

  return {
    theme,
    setTheme: (t: ConfTheme) => setConf.mutate({ ...conf.data, theme: t }),
    themes: THEMES,
  };
}
