import React, { createContext, useContext, useState, useCallback, useRef, ReactNode } from 'react';
import { useFocusEffect } from 'expo-router';

interface HeaderOptions {
  title: string;
  showBackButton: boolean;
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
  const { setOptions } = useHeader();

  // Utiliser une ref pour éviter les boucles infinies avec les fonctions callback
  const optionsRef = useRef(options);
  optionsRef.current = options;

  useFocusEffect(
    useCallback(() => {
      setOptions(optionsRef.current);
    }, [setOptions])
  );
}
