import React, { createContext, useContext, useState, useCallback, useRef, useEffect, ReactNode } from 'react';
import { useFocusEffect } from 'expo-router';

interface HeaderOptions {
  title: string;
  showBackButton: boolean;
  subtitle?: string;
  isPaused?: boolean;
  dimmed?: boolean;
  onTitlePress?: () => void;
  onMenuPress?: () => void;
  onBackPress?: () => void;
}

interface HeaderContextType {
  options: HeaderOptions;
  setOptions: (options: Partial<HeaderOptions>) => void;
  resetOptions: () => void;
}

const defaultOptions: HeaderOptions = {
  title: 'Cashou',
  showBackButton: false,
  onMenuPress: undefined,
  onBackPress: undefined,
};

const HeaderContext = createContext<HeaderContextType | undefined>(undefined);

export function HeaderProvider({ children }: { children: ReactNode }) {
  const [options, setOptionsState] = useState<HeaderOptions>(defaultOptions);

  const setOptions = useCallback((newOptions: Partial<HeaderOptions>) => {
    setOptionsState(prev => ({ ...prev, ...newOptions }));
  }, []);

  const resetOptions = useCallback(() => {
    setOptionsState(defaultOptions);
  }, []);

  return (
    <HeaderContext.Provider value={{ options, setOptions, resetOptions }}>
      {children}
    </HeaderContext.Provider>
  );
}

export function useHeader() {
  const context = useContext(HeaderContext);
  if (!context) {
    throw new Error('useHeader must be used within a HeaderProvider');
  }
  return context;
}

// Hook pour configurer le header à chaque focus d'un écran
export function useHeaderOptions(options: Partial<HeaderOptions>) {
  const { setOptions, resetOptions } = useHeader();

  // Utiliser une ref pour éviter les boucles infinies avec les fonctions callback
  const optionsRef = useRef(options);
  optionsRef.current = options;

  useFocusEffect(
    useCallback(() => {
      // Reset to defaults first, then apply screen-specific options
      resetOptions();
      setOptions(optionsRef.current);
    }, [setOptions, resetOptions])
  );
}

/**
 * Hook for game/* screens to inject the live game date subtitle and isPaused state.
 * The play/pause icon is rendered by CashouHeader based on the isPaused prop.
 */
export function useGameHeaderSubtitle(
  formattedGameDate: string | null,
  isPaused: boolean,
  isEnded: boolean,
) {
  const { setOptions } = useHeader();

  useEffect(() => {
    if (isEnded || !formattedGameDate) {
      setOptions({ subtitle: undefined, isPaused: undefined });
      return;
    }
    setOptions({ subtitle: formattedGameDate, isPaused });
  }, [formattedGameDate, isPaused, isEnded, setOptions]);
}
