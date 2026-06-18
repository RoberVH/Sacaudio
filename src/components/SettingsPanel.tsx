/**
 * SettingsPanel Component
 * 
 * Provides settings for theme, language, and other preferences
 * Optimized with React.memo to prevent unnecessary re-renders
 */

import React, { useCallback, useState, useEffect, memo } from 'react';
import { useTranslation } from 'react-i18next';
import { SettingsPanelProps, Theme, Language, AudioFormat } from '../types';
import { Moon, Sun, Globe, Languages, FileText, Settings as SettingsIcon } from 'lucide-react';

const THEME_OPTIONS: Theme[] = ['light', 'dark', 'system'];
const LANGUAGE_OPTIONS: Language[] = ['en', 'es', 'pt'];
const FORMAT_OPTIONS: AudioFormat[] = ['wav', 'mp3', 'aac', 'flac', 'ogg'];

// Memoize the component to prevent unnecessary re-renders
const SettingsPanelComponent: React.FC<SettingsPanelProps> = ({
  theme,
  language,
  baseFilename,
  audioFormat,
  onThemeChange,
  onLanguageChange,
  onBaseFilenameChange,
  onAudioFormatChange,
}) => {
  const { t, i18n } = useTranslation();
  const [isOpen, setIsOpen] = useState(false);
  const [showThemeMenu, setShowThemeMenu] = useState(false);
  const [showLanguageMenu, setShowLanguageMenu] = useState(false);
  const [showFormatMenu, setShowFormatMenu] = useState(false);

  // Toggle settings panel
  const toggleSettings = useCallback(() => {
    setIsOpen(!isOpen);
  }, [isOpen]);

  // Handle theme change
  const handleThemeChange = useCallback((newTheme: Theme) => {
    onThemeChange(newTheme);
    setShowThemeMenu(false);
  }, [onThemeChange]);

  // Handle language change
  const handleLanguageChange = useCallback((newLanguage: Language) => {
    onLanguageChange(newLanguage);
    i18n.changeLanguage(newLanguage);
    setShowLanguageMenu(false);
  }, [onLanguageChange, i18n]);

  // Handle base filename change
  const handleBaseFilenameChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    onBaseFilenameChange(e.target.value);
  }, [onBaseFilenameChange]);

  // Handle audio format change
  const handleAudioFormatChange = useCallback((newFormat: AudioFormat) => {
    onAudioFormatChange(newFormat);
    setShowFormatMenu(false);
  }, [onAudioFormatChange]);

  // Get theme icon
  const getThemeIcon = useCallback(() => {
    switch (theme) {
      case 'light':
        return <Sun className="w-4 h-4" />;
      case 'dark':
        return <Moon className="w-4 h-4" />;
      case 'system':
        return <Globe className="w-4 h-4" />;
      default:
        return <Sun className="w-4 h-4" />;
    }
  }, [theme]);

  // Get theme label
  const getThemeLabel = useCallback(() => {
    return t('settings.themes', { returnObjects: true })[theme];
  }, [theme, t]);

  // Get language label
  const getLanguageLabel = useCallback(() => {
    return t('settings.languages', { returnObjects: true })[language];
  }, [language, t]);

  // Get format label
  const getFormatLabel = useCallback(() => {
    return t('audio.formats', { returnObjects: true })[audioFormat];
  }, [audioFormat, t]);

  // Close menus when clicking outside
  const handleClickOutside = useCallback((e: MouseEvent) => {
    const target = e.target as HTMLElement;
    if (!target.closest('.settings-menu') && !target.closest('.settings-button')) {
      setShowThemeMenu(false);
      setShowLanguageMenu(false);
      setShowFormatMenu(false);
    }
  }, []);

  useEffect(() => {
    if (showThemeMenu || showLanguageMenu || showFormatMenu) {
      document.addEventListener('click', handleClickOutside);
    }
    return () => {
      document.removeEventListener('click', handleClickOutside);
    };
  }, [showThemeMenu, showLanguageMenu, showFormatMenu, handleClickOutside]);

  return (
    <div className="fixed bottom-4 right-4 z-50">
      {/* Settings toggle button */}
      <button
        onClick={toggleSettings}
        className="p-3 bg-primary-500 text-white rounded-full shadow-lg hover:bg-primary-600 transition-colors settings-button"
        title={t('settings.title')}
      >
        <SettingsIcon className="w-6 h-6" />
      </button>

      {/* Settings panel */}
      {isOpen && (
        <div className="absolute bottom-full right-0 mb-4 w-80 bg-white dark:bg-gray-800 rounded-lg shadow-xl border border-gray-200 dark:border-gray-700 overflow-hidden settings-menu">
          <div className="p-4 border-b border-gray-200 dark:border-gray-700">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 flex items-center gap-2">
              <SettingsIcon className="w-5 h-5" />
              {t('settings.title')}
            </h3>
          </div>

          <div className="p-4 space-y-4">
            {/* Theme setting */}
            <div className="space-y-2">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                {t('settings.theme')}
              </label>
              <div className="relative">
                <button
                  onClick={() => setShowThemeMenu(!showThemeMenu)}
                  className="w-full flex items-center justify-between px-3 py-2 bg-gray-100 dark:bg-gray-700 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
                >
                  <div className="flex items-center gap-2">
                    {getThemeIcon()}
                    <span>{getThemeLabel()}</span>
                  </div>
                  <svg
                    className={`w-4 h-4 text-gray-500 transition-transform ${
                      showThemeMenu ? 'rotate-180' : ''
                    }`}
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </button>

                {showThemeMenu && (
                  <div className="absolute top-full left-0 mt-1 w-full bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 overflow-hidden z-50">
                    {THEME_OPTIONS.map((themeOption) => (
                      <button
                        key={themeOption}
                        onClick={() => handleThemeChange(themeOption)}
                        className={`w-full px-3 py-2 text-left hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors flex items-center gap-2 ${
                          theme === themeOption
                            ? 'bg-primary-500 text-white dark:bg-primary-600'
                            : 'text-gray-700 dark:text-gray-300'
                        }`}
                      >
                        {themeOption === 'light' && <Sun className="w-4 h-4" />}
                        {themeOption === 'dark' && <Moon className="w-4 h-4" />}
                        {themeOption === 'system' && <Globe className="w-4 h-4" />}
                        <span>{t('settings.themes', { returnObjects: true })[themeOption]}</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Language setting */}
            <div className="space-y-2">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                {t('settings.language')}
              </label>
              <div className="relative">
                <button
                  onClick={() => setShowLanguageMenu(!showLanguageMenu)}
                  className="w-full flex items-center justify-between px-3 py-2 bg-gray-100 dark:bg-gray-700 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
                >
                  <div className="flex items-center gap-2">
                    <Languages className="w-4 h-4" />
                    <span>{getLanguageLabel()}</span>
                  </div>
                  <svg
                    className={`w-4 h-4 text-gray-500 transition-transform ${
                      showLanguageMenu ? 'rotate-180' : ''
                    }`}
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </button>

                {showLanguageMenu && (
                  <div className="absolute top-full left-0 mt-1 w-full bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 overflow-hidden z-50">
                    {LANGUAGE_OPTIONS.map((lang) => (
                      <button
                        key={lang}
                        onClick={() => handleLanguageChange(lang)}
                        className={`w-full px-3 py-2 text-left hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors flex items-center gap-2 ${
                          language === lang
                            ? 'bg-primary-500 text-white dark:bg-primary-600'
                            : 'text-gray-700 dark:text-gray-300'
                        }`}
                      >
                        <span className="w-4 h-4 flex items-center justify-center text-sm font-bold">
                          {lang.toUpperCase()}
                        </span>
                        <span>{t('settings.languages', { returnObjects: true })[lang]}</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Audio format setting */}
            <div className="space-y-2">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                {t('audio.format')}
              </label>
              <div className="relative">
                <button
                  onClick={() => setShowFormatMenu(!showFormatMenu)}
                  className="w-full flex items-center justify-between px-3 py-2 bg-gray-100 dark:bg-gray-700 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
                >
                  <div className="flex items-center gap-2">
                    <FileText className="w-4 h-4" />
                    <span>{getFormatLabel()}</span>
                  </div>
                  <svg
                    className={`w-4 h-4 text-gray-500 transition-transform ${
                      showFormatMenu ? 'rotate-180' : ''
                    }`}
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </button>

                {showFormatMenu && (
                  <div className="absolute top-full left-0 mt-1 w-full bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 overflow-hidden z-50">
                    {FORMAT_OPTIONS.map((format) => (
                      <button
                        key={format}
                        onClick={() => handleAudioFormatChange(format)}
                        className={`w-full px-3 py-2 text-left hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors flex items-center gap-2 ${
                          audioFormat === format
                            ? 'bg-primary-500 text-white dark:bg-primary-600'
                            : 'text-gray-700 dark:text-gray-300'
                        }`}
                      >
                        <FileText className="w-4 h-4" />
                        <span>{t('audio.formats', { returnObjects: true })[format]}</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Base filename setting */}
            <div className="space-y-2">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                {t('audio.baseFilename')}
              </label>
              <input
                type="text"
                value={baseFilename}
                onChange={handleBaseFilenameChange}
                placeholder={t('audio.baseFilename')}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              />
              <p className="text-xs text-gray-500 dark:text-gray-400">
                {t('audio.preserveQuality')}
              </p>
            </div>
          </div>

          <div className="p-4 border-t border-gray-200 dark:border-gray-700">
            <button
              onClick={toggleSettings}
              className="w-full py-2 bg-gray-500 text-white rounded-lg hover:bg-gray-600 transition-colors"
            >
              Close
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

// Compare props to prevent unnecessary re-renders
const arePropsEqual = (prevProps: SettingsPanelProps, nextProps: SettingsPanelProps) => {
  return (
    prevProps.theme === nextProps.theme &&
    prevProps.language === nextProps.language &&
    prevProps.baseFilename === nextProps.baseFilename &&
    prevProps.audioFormat === nextProps.audioFormat &&
    prevProps.onThemeChange === nextProps.onThemeChange &&
    prevProps.onLanguageChange === nextProps.onLanguageChange &&
    prevProps.onBaseFilenameChange === nextProps.onBaseFilenameChange &&
    prevProps.onAudioFormatChange === nextProps.onAudioFormatChange
  );
};

// Export memoized component
const SettingsPanel = memo(SettingsPanelComponent, arePropsEqual);
SettingsPanel.displayName = 'SettingsPanel';

export default SettingsPanel;
