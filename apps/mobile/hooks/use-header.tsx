import React, { createContext, useContext, useState, useCallback, ReactNode } from 'react';

interface HeaderOptions {
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
  showBackButton: true,
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

// Hook pour configurer le header au montage d'un écran
export function useHeaderOptions(options: Partial<HeaderOptions>) {
  const { setOptions, resetOptions } = useHeader();

  React.useEffect(() => {
    setOptions(options);
    return () => resetOptions();
  }, []);
}
