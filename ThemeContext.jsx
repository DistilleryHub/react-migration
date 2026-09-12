import { createContext, useContext, useEffect, useState } from 'react';

const ThemeContext = createContext(null);

const THEME_KEY = 'dh-theme';     // 'dark' | 'light'
const ACCENT_KEY = 'dh-accent';   // hex color
const COMPACT_KEY = 'dh-compact'; // '1' | '0'

export const ACCENT_COLORS = [
  { key: 'blue', value: '#4f7fff', label: 'Blue' },
  { key: 'teal', value: '#0ea5a4', label: 'Teal' },
  { key: 'green', value: '#22c55e', label: 'Green' },
  { key: 'orange', value: '#f97316', label: 'Orange' },
  { key: 'purple', value: '#a855f7', label: 'Purple' },
  { key: 'pink', value: '#ec4899', label: 'Pink' },
];

function hexToRgb(hex) {
  const m = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return m ? `${parseInt(m[1], 16)}, ${parseInt(m[2], 16)}, ${parseInt(m[3], 16)}` : '79, 127, 255';
}

function applyTheme(theme) {
  document.documentElement.setAttribute('data-theme', theme);
}

function applyAccent(hex) {
  document.documentElement.style.setProperty('--primary', hex);
  document.documentElement.style.setProperty('--primary-hover', hex);
  document.documentElement.style.setProperty('--primary-soft', `rgba(${hexToRgb(hex)}, 0.12)`);
}

function applyCompact(isCompact) {
  document.documentElement.style.setProperty('--radius', isCompact ? '10px' : '14px');
}

export function ThemeProvider({ children }) {
  const [theme, setThemeState] = useState(() => localStorage.getItem(THEME_KEY) || 'dark');
  const [accent, setAccentState] = useState(() => localStorage.getItem(ACCENT_KEY) || ACCENT_COLORS[0].value);
  const [compact, setCompactState] = useState(() => localStorage.getItem(COMPACT_KEY) === '1');

  useEffect(() => { applyTheme(theme); localStorage.setItem(THEME_KEY, theme); }, [theme]);
  useEffect(() => { applyAccent(accent); localStorage.setItem(ACCENT_KEY, accent); }, [accent]);
  useEffect(() => { applyCompact(compact); localStorage.setItem(COMPACT_KEY, compact ? '1' : '0'); }, [compact]);

  function setTheme(t) { setThemeState(t === 'light' ? 'light' : 'dark'); }
  function setAccent(hex) { setAccentState(hex); }
  function setCompact(v) { setCompactState(!!v); }

  const value = { theme, setTheme, accent, setAccent, compact, setCompact, ACCENT_COLORS };

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme() {
  return useContext(ThemeContext);
}
