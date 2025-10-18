import React, { createContext, useContext, useMemo } from 'react';
import CommandService from './services/CommandService';

const CommandServiceContext = createContext(null);

export const CommandServiceProvider = ({ sendRawMessage, children }) => {
  const commandService = useMemo(() => new CommandService(sendRawMessage), [sendRawMessage]);
  
  return (
    <CommandServiceContext.Provider value={commandService}>
      {children}
    </CommandServiceContext.Provider>
  );
};

export const useCommandService = () => {
  const context = useContext(CommandServiceContext);
  if (!context) {
    throw new Error('useCommandService must be used within a CommandServiceProvider');
  }
  return context;
};