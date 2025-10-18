import { useInputWithHistory } from '../utils/hooks';
import { NARSESE_SUGGESTIONS } from '../constants';

const InputField = ({ onSend }) => {
  const { inputValue, setInputValue, history, handleSubmit, handleArrowNavigation } = useInputWithHistory();

  const handleKeyDown = (e) => {
    if (e.key === 'ArrowUp' || e.key === 'ArrowDown') {
      handleArrowNavigation(e);
    } else if (e.key === 'Tab') {
      e.preventDefault();
      const parts = inputValue.split(/(\s+)/);
      const lastPart = parts[parts.length - 1];
      if (lastPart.trim()) {
        const match = [...NARSESE_SUGGESTIONS].find(s => s.startsWith(lastPart));
        if (match) {
          parts[parts.length - 1] = match;
          setInputValue(parts.join(''));
        }
      }
    }
  };

  return (
    <div className="input-field">
      <div className="input-row">
        <form className="input-form" onSubmit={e => (e.preventDefault(), handleSubmit(onSend))}>
          <input
            className="input-text"
            type="text"
            value={inputValue}
            onChange={e => setInputValue(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Enter command or narsese... (Tab for autocomplete)"
            autoFocus
          />
        </form>
        <button className="send-button" type="submit" onClick={() => handleSubmit(onSend)}>
          Send
        </button>
      </div>
      {history.length > 0 && (
        <div className="history-indicator">
          History: {history.length} entries (use ↑/↓ to navigate)
        </div>
      )}
    </div>
  );
};

export default InputField;