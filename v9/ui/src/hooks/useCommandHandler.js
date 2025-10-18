import { useMemo, useCallback } from 'react';
import CommandService from '../services/CommandService';

const COMMANDS_REQUIRING_STATE_UPDATE = new Set(['start', 'step', 'stop', 'reset']);
const COMMANDS_REQUIRING_CONCEPT_UPDATE = new Set(['start', 'step', 'add_task']);

const useCommandHandler = (sendRawMessage, requestState, requestConcepts, requestTopTasks, on, off) => {
  const commandService = useMemo(() => new CommandService(sendRawMessage), [sendRawMessage]);

  const handleCommand = useCallback((command, payload = {}) => {
    console.log(`Executing command: ${command}`, payload);
    commandService.execute(command, payload);

    const needsStateUpdate = COMMANDS_REQUIRING_STATE_UPDATE.has(command);
    const needsConceptUpdate = COMMANDS_REQUIRING_CONCEPT_UPDATE.has(command);

    if (on && off && (needsStateUpdate || needsConceptUpdate)) {
      const onceListener = () => {
        needsStateUpdate && requestState();
        if (needsConceptUpdate) {
          requestConcepts();
          requestTopTasks();
        }
      };

      const wrapper = () => {
        off('message', wrapper);
        clearTimeout(timeoutId);
        onceListener();
      };

      on('message', wrapper);

      // Auto-cleanup after 3 seconds
      const timeoutId = setTimeout(() => off('message', wrapper), 3000);
    }
  }, [sendRawMessage, requestState, requestConcepts, requestTopTasks, on, off, commandService]);

  return { handleCommand };
};

export default useCommandHandler;
