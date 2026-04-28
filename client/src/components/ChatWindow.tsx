import { Message } from '../types';
import MessageList from './MessageList';
import InputBar from './InputBar';
import OptionSelector from './OptionSelector';

interface ChatWindowProps {
  messages: Message[];
  isTyping: boolean;
  onSendMessage: (text: string) => void;
  currentOptions?: string[];
}

export default function ChatWindow({ messages, isTyping, onSendMessage, currentOptions }: ChatWindowProps) {
  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        height: '100%',
        maxWidth: '600px',
        margin: '0 auto',
        border: '1px solid #e5e7eb',
        borderRadius: '12px',
        overflow: 'hidden',
        backgroundColor: '#ffffff',
      }}
    >
      <MessageList messages={messages} isTyping={isTyping} />

      {currentOptions && currentOptions.length > 0 && !isTyping && (
        <div style={{ padding: '8px 12px', borderTop: '1px solid #e5e7eb' }}>
          <OptionSelector options={currentOptions} onSelect={onSendMessage} />
        </div>
      )}

      <InputBar onSend={onSendMessage} disabled={isTyping} />
    </div>
  );
}
