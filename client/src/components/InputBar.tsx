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
    <form
      onSubmit={handleSubmit}
      style={{
        display: 'flex',
        padding: '12px',
        borderTop: '1px solid #e5e7eb',
        gap: '8px',
      }}
    >
      <input
        type="text"
        value={input}
        onChange={(e) => setInput(e.target.value)}
        placeholder="Escribe tu mensaje..."
        disabled={disabled}
        style={{
          flex: 1,
          padding: '10px 12px',
          borderRadius: '8px',
          border: '1px solid #d1d5db',
          fontSize: '14px',
          outline: 'none',
          opacity: disabled ? 0.5 : 1,
        }}
      />
      <button
        type="submit"
        disabled={!input.trim() || disabled}
        style={{
          padding: '10px 20px',
          borderRadius: '8px',
          border: 'none',
          backgroundColor: '#0d9488',
          color: '#ffffff',
          fontSize: '14px',
          cursor: !input.trim() || disabled ? 'not-allowed' : 'pointer',
          opacity: !input.trim() || disabled ? 0.5 : 1,
        }}
      >
        Enviar
      </button>
    </form>
  );
}
