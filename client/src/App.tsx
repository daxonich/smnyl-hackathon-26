import { useEffect, useState, useCallback } from 'react';
import { Message } from './types';
import ChatWindow from './components/ChatWindow';
import { startChat, sendMessage, getSession, getSavedSessionId } from './api';

function App() {
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [_step, setStep] = useState<string>('');
  const [isTyping, setIsTyping] = useState(false);
  const [currentOptions, setCurrentOptions] = useState<string[]>([]);

  useEffect(() => {
    const init = async () => {
      // Check sessionStorage for an existing session
      const savedId = getSavedSessionId();
      if (savedId) {
        try {
          const session = await getSession(savedId);
          if (session) {
            setSessionId(session.sessionId);
            setStep(session.step);
            setMessages([
              {
                id: crypto.randomUUID(),
                text: 'Sesión restaurada. Puedes continuar donde te quedaste.',
                sender: 'system',
                timestamp: new Date(),
              },
            ]);
            return;
          }
        } catch {
          // Session not recoverable — fall through to start fresh
        }
      }

      // No saved session or it was expired/invalid — start fresh
      try {
        const data = await startChat();
        setSessionId(data.sessionId);
        setStep(data.step);
        setCurrentOptions(data.options ?? []);
        setMessages([
          {
            id: crypto.randomUUID(),
            text: data.message,
            sender: 'system',
            timestamp: new Date(),
            options: data.options,
          },
        ]);
      } catch {
        setMessages([
          {
            id: crypto.randomUUID(),
            text: 'No se pudo conectar con el servidor. Intenta recargar la página.',
            sender: 'system',
            timestamp: new Date(),
          },
        ]);
      }
    };

    init();
  }, []);

  const handleSendMessage = useCallback(
    async (text: string) => {
      if (!sessionId) return;

      const userMsg: Message = {
        id: crypto.randomUUID(),
        text,
        sender: 'user',
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, userMsg]);
      setCurrentOptions([]);
      setIsTyping(true);

      try {
        const data = await sendMessage(sessionId, text);
        setStep(data.step);

        const systemMsg: Message = {
          id: crypto.randomUUID(),
          text: data.message,
          sender: 'system',
          timestamp: new Date(),
          options: data.options,
          agent: data.agent,
          summary: data.summary,
        };
        setMessages((prev) => [...prev, systemMsg]);
        setCurrentOptions(data.options ?? []);
      } catch {
        setMessages((prev) => [
          ...prev,
          {
            id: crypto.randomUUID(),
            text: 'Error al enviar el mensaje. Intenta de nuevo.',
            sender: 'system',
            timestamp: new Date(),
          },
        ]);
      } finally {
        setIsTyping(false);
      }
    },
    [sessionId],
  );

  return (
    <div className="app-layout">
      <header className="app-header">
        <h1>Asignación Inteligente de Agentes</h1>
      </header>

      <main className="app-main">
        <ChatWindow
          messages={messages}
          isTyping={isTyping}
          onSendMessage={handleSendMessage}
          currentOptions={currentOptions}
        />
      </main>
    </div>
  );
}

export default App;
