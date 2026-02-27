import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';

type Theme = 'light' | 'dark' | 'system';

interface ThemeContextType {
  isDark: boolean;
  theme: Theme;
  setTheme: (theme: Theme) => void;
  toggle: () => void;
}

const ThemeContext = createContext<ThemeContextType>({
  isDark: false,
  theme: 'system',
  setTheme: () => {},
  toggle: () => {},
});

const getSystemDark = () => window.matchMedia('(prefers-color-scheme: dark)').matches;

const resolveIsDark = (theme: Theme) => (theme === 'system' ? getSystemDark() : theme === 'dark');

export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [theme, setThemeState] = useState<Theme>(() => {
    const stored = localStorage.getItem('theme') as Theme | null;
    return stored && ['light', 'dark', 'system'].includes(stored) ? stored : 'system';
  });

  const [isDark, setIsDark] = useState(() => resolveIsDark(theme));

  const apply = useCallback((t: Theme) => {
    const dark = resolveIsDark(t);
    setIsDark(dark);
    document.documentElement.classList.toggle('dark', dark);
  }, []);

  const setTheme = useCallback((t: Theme) => {
    localStorage.setItem('theme', t);
    setThemeState(t);
    apply(t);
  }, [apply]);

  const toggle = useCallback(() => {
    setTheme(isDark ? 'light' : 'dark');
  }, [isDark, setTheme]);

  // Apply on mount
  useEffect(() => { apply(theme); }, []);

  // Listen for system changes when theme is 'system'
  useEffect(() => {
    if (theme !== 'system') return;
    const mq = window.matchMedia('(prefers-color-scheme: dark)');
    const handler = () => apply('system');
    mq.addEventListener('change', handler);
    return () => mq.removeEventListener('change', handler);
  }, [theme, apply]);

  return (
    <ThemeContext.Provider value={{ isDark, theme, setTheme, toggle }}>
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = () => useContext(ThemeContext);
