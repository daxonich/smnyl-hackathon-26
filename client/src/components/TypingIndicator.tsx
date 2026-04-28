interface TypingIndicatorProps {
  isTyping: boolean;
}

const dotStyle: React.CSSProperties = {
  width: '8px',
  height: '8px',
  borderRadius: '50%',
  backgroundColor: '#9ca3af',
  display: 'inline-block',
  margin: '0 2px',
  animation: 'typing-bounce 1.4s infinite ease-in-out both',
};

export default function TypingIndicator({ isTyping }: TypingIndicatorProps) {
  if (!isTyping) return null;

  return (
    <div
      style={{
        alignSelf: 'flex-start',
        padding: '10px 14px',
        borderRadius: '12px',
        backgroundColor: '#f3f4f6',
        marginBottom: '8px',
        display: 'flex',
        alignItems: 'center',
        gap: '2px',
      }}
    >
      <style>{`
        @keyframes typing-bounce {
          0%, 80%, 100% { transform: scale(0); }
          40% { transform: scale(1); }
        }
      `}</style>
      <span style={{ ...dotStyle, animationDelay: '-0.32s' }} />
      <span style={{ ...dotStyle, animationDelay: '-0.16s' }} />
      <span style={{ ...dotStyle, animationDelay: '0s' }} />
    </div>
  );
}
