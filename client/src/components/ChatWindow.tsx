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
    <div className="chat-window">
      <MessageList messages={messages} isTyping={isTyping} />

      {currentOptions && currentOptions.length > 0 && !isTyping && (
        <div className="chat-options-bar">
          <OptionSelector options={currentOptions} onSelect={onSendMessage} />
        </div>
      )}

      <InputBar onSend={onSendMessage} disabled={isTyping} />
    </div>
  );
}
