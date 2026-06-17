/**
 * Theme management utilities
 */

import { Theme } from '../types';

/**
 * Get the current theme from localStorage or system preference
 * @returns Current theme
 */
export function getTheme(): Theme {
  const stored = localStorage.getItem('theme') as Theme | null;
  if (stored) {
    return stored;
  }
  
  // Check system preference
  if (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) {
    return 'dark';
  }
  
  return 'light';
}

/**
 * Set the theme and update document class
 * @param theme - Theme to set
 */
export function setTheme(theme: Theme): void {
  // Store in localStorage
  localStorage.setItem('theme', theme);
  
  // Update document class
  const html = document.documentElement;
  
  // Remove all theme classes
  html.classList.remove('light', 'dark');
  
  // Add the selected theme class
  if (theme === 'light') {
    html.classList.add('light');
  } else if (theme === 'dark') {
    html.classList.add('dark');
  } else {
    // System theme - check preference
    if (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) {
      html.classList.add('dark');
    } else {
      html.classList.add('light');
    }
  }
}

/**
 * Initialize theme on app load
 */
export function initializeTheme(): void {
  const theme = getTheme();
  setTheme(theme);
}

/**
 * Toggle between light and dark themes
 * @returns New theme
 */
export function toggleTheme(): Theme {
  const current = getTheme();
  const newTheme = current === 'light' ? 'dark' : 'light';
  setTheme(newTheme);
  return newTheme;
}

/**
 * Get theme class for Tailwind
 * @param theme - Current theme
 * @returns Tailwind theme class
 */
export function getThemeClass(theme: Theme): string {
  if (theme === 'system') {
    return window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches
      ? 'dark'
      : 'light';
  }
  return theme;
}
