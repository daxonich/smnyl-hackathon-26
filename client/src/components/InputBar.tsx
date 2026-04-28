import { useState } from 'react';

interface InputBarProps {
  onSend: (text: string) => void;
  disabled?: boolean;
}

export default function InputBar({ onSend, disabled }: InputBarProps) {
  const [input, setInput] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const text = input.trim();
    if (!text || disabled) return;
    onSend(text);
    setInput('');
  };

  return (
    <form onSubmit={handleSubmit} className="input-bar">
      <input
        type="text"
        value={input}
        onChange={(e) => setInput(e.target.value)}
        placeholder="Escribe tu mensaje..."
        disabled={disabled}
        className="input-bar__field"
      />
      <button
        type="submit"
        disabled={!input.trim() || disabled}
        className="input-bar__btn"
      >
        Enviar
      </button>
    </form>
  );
}
