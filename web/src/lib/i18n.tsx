'use client';

import { createContext, useContext, useState, useCallback, useEffect, ReactNode } from 'react';

type Dict = Record<string, string>;

interface I18nCtx {
  lang: string;
  toggle: () => void;
  t: (key: string) => string;
  setLang: (l: string) => void;
}

const Ctx = createContext<I18nCtx>({
  lang: 'es', toggle: () => {}, t: (k) => k, setLang: () => {},
});

async function loadDict(lang: string): Promise<Dict> {
  if (lang === 'en') return (await import('./en')).default;
  return (await import('./es')).default;
}

export function I18nProvider({ children }: { children: ReactNode }) {
  const [lang, setLangState] = useState<string>('es');
  const [dict, setDict] = useState<Dict | null>(null);

  useEffect(() => {
    loadDict(lang).then(setDict);
  }, [lang]);

  const toggle = useCallback(() => setLangState(prev => prev === 'es' ? 'en' : 'es'), []);
  const setLang = useCallback((l: string) => setLangState(l), []);
  const t = useCallback((key: string) => dict?.[key] || key, [dict]);

  return <Ctx value={{ lang, toggle, t, setLang }}>{children}</Ctx>;
}

export const useI18n = () => useContext(Ctx);
