import React, { createContext, useContext, useState, useCallback } from 'react';

const AppContext = createContext(null);

export function AppProvider({ children }) {
  const [globalConfig, setGlobalConfig] = useState({
    sidebarOpen: true,
  });

  const toggleSidebar = useCallback(() => {
    setGlobalConfig(prev => ({ ...prev, sidebarOpen: !prev.sidebarOpen }));
  }, []);

  const value = {
    ...globalConfig,
    toggleSidebar,
    setGlobalConfig,
  };

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

export function useAppContext() {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useAppContext must be used within AppProvider');
  }
  return context;
}
