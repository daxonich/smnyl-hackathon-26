interface TypingIndicatorProps {
  isTyping: boolean;
}

export default function TypingIndicator({ isTyping }: TypingIndicatorProps) {
  if (!isTyping) return null;

  return (
    <div className="typing-indicator">
      <span className="typing-dot" style={{ animationDelay: '-0.32s' }} />
      <span className="typing-dot" style={{ animationDelay: '-0.16s' }} />
      <span className="typing-dot" style={{ animationDelay: '0s' }} />
    </div>
  );
}
